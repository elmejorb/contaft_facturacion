<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use App\Models\VendedorCliente;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ClienteController extends Controller
{
    /**
     * GET /api/clientes
     * Lista los clientes asignados al vendedor autenticado.
     * Soporta búsqueda por nombre/documento y paginación simple.
     */
    public function index(Request $request): JsonResponse
    {
        $vendedor = Auth::user();
        $search = trim($request->query('q', ''));
        $perPage = min((int) $request->query('per_page', 50), 200);
        $page = max((int) $request->query('page', 1), 1);

        $query = Cliente::query()
            ->join('mobile_vendedor_clientes', 'clientes.id_cliente', '=', 'mobile_vendedor_clientes.id_cliente')
            ->where('mobile_vendedor_clientes.id_vendedor_mobile', $vendedor->id)
            ->where('clientes.id_empresa', $vendedor->id_empresa)
            ->where('clientes.estado', true)
            ->select('clientes.*');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('clientes.nombre_razon_social', 'like', "%{$search}%")
                  ->orWhere('clientes.numero_documento', 'like', "%{$search}%")
                  ->orWhere('clientes.codigo_cliente', 'like', "%{$search}%")
                  ->orWhere('clientes.telefono', 'like', "%{$search}%")
                  ->orWhere('clientes.celular', 'like', "%{$search}%");
            });
        }

        $total = $query->count();
        $items = $query->orderBy('clientes.nombre_razon_social')
            ->offset(($page - 1) * $perPage)
            ->limit($perPage)
            ->get();

        // Añade is_own (si el vendedor autenticado lo creó)
        $vendedorId = $vendedor->id;
        $items = $items->map(function ($c) use ($vendedorId) {
            $c->is_own = ((int) $c->creado_por_vendedor_mobile === (int) $vendedorId);
            return $c;
        });

        return response()->json([
            'error' => false,
            'clientes' => $items,
            'total' => $total,
            'per_page' => $perPage,
            'page' => $page,
            'last_page' => (int) ceil($total / $perPage),
        ]);
    }

    /**
     * GET /api/clientes/{id}
     */
    public function show(int $id): JsonResponse
    {
        $vendedor = Auth::user();

        $cliente = Cliente::where('id_cliente', $id)
            ->where('id_empresa', $vendedor->id_empresa)
            ->first();

        if (!$cliente) {
            return response()->json(['error' => true, 'mensaje' => 'Cliente no encontrado'], 404);
        }

        $asignado = VendedorCliente::where('id_vendedor_mobile', $vendedor->id)
            ->where('id_cliente', $id)
            ->exists();

        if (!$asignado) {
            return response()->json(['error' => true, 'mensaje' => 'Cliente no asignado a este vendedor'], 403);
        }

        $cliente->is_own = ((int) $cliente->creado_por_vendedor_mobile === (int) $vendedor->id);

        return response()->json(['error' => false, 'cliente' => $cliente]);
    }

    /**
     * POST /api/clientes
     * Crea un cliente y lo asigna automáticamente al vendedor autenticado.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nombre_razon_social' => 'required|string|max:200',
            'tipo_documento'      => 'required|string|max:10',
            'numero_documento'    => 'required|string|max:30',
            'digito_verificacion' => 'nullable|string|max:5',
            'telefono'            => 'nullable|string|max:50',
            'celular'             => 'nullable|string|max:50',
            'email'               => 'nullable|email|max:150',
            'direccion'           => 'nullable|string|max:300',
            'departamento'        => 'nullable|string|max:100',
            'municipio'           => 'nullable|string|max:100',
            'id_municipio'        => 'nullable|integer|exists:municipalities,id',
            'tipo_responsabilidad' => 'nullable|string|max:10',
            'regimen_tributario'  => 'nullable|string|max:10',
            'tipo_organizacion'   => 'nullable|string|max:10',
            'cupo_autorizado'     => 'nullable|numeric|min:0',
            'latitud'             => 'nullable|numeric|between:-90,90',
            'longitud'            => 'nullable|numeric|between:-180,180',
            'precision_gps_metros' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error'   => true,
                'mensaje' => 'Datos inválidos',
                'errores' => $validator->errors(),
            ], 422);
        }

        $vendedor = Auth::user();

        $existente = Cliente::where('id_empresa', $vendedor->id_empresa)
            ->where('numero_documento', $request->numero_documento)
            ->first();

        if ($existente) {
            VendedorCliente::firstOrCreate([
                'id_vendedor_mobile' => $vendedor->id,
                'id_cliente'         => $existente->id_cliente,
            ], ['fecha_asignacion' => \Carbon\Carbon::now()]);

            return response()->json([
                'error'    => false,
                'mensaje'  => 'Cliente ya existía, se asignó al vendedor',
                'cliente'  => $existente,
                'reasignado' => true,
            ]);
        }

        try {
            DB::beginTransaction();

            $ultimoCodigo = Cliente::where('id_empresa', $vendedor->id_empresa)
                ->orderByDesc('id_cliente')
                ->value('codigo_cliente');
            $numero = $ultimoCodigo ? (int) substr($ultimoCodigo, 3) + 1 : 1;
            $codigo = 'CLI' . str_pad((string) $numero, 4, '0', STR_PAD_LEFT);

            $payload = array_merge(
                $request->only([
                    'nombre_razon_social', 'tipo_documento', 'numero_documento',
                    'digito_verificacion', 'telefono', 'celular', 'email',
                    'direccion', 'departamento', 'municipio',
                    'latitud', 'longitud', 'precision_gps_metros',
                    'tipo_responsabilidad', 'regimen_tributario', 'tipo_organizacion',
                    'cupo_autorizado',
                ]),
                [
                    'id_empresa'                  => $vendedor->id_empresa,
                    'codigo_cliente'              => $codigo,
                    'creado_por_vendedor_mobile'  => $vendedor->id,
                    'estado'                      => true,
                ]
            );

            // Si viene id_municipio, resolvemos nombre de municipio + departamento
            if ($request->filled('id_municipio')) {
                $muni = DB::table('municipalities as m')
                    ->leftJoin('departments as d', 'm.department_id', '=', 'd.id')
                    ->where('m.id', (int) $request->input('id_municipio'))
                    ->select('m.id', 'm.name as mname', 'd.id as did', 'd.name as dname')
                    ->first();
                if ($muni) {
                    $payload['id_municipio']    = $muni->id;
                    $payload['municipio']       = $muni->mname;
                    $payload['id_departamento'] = $muni->did;
                    $payload['departamento']    = $muni->dname;
                }
            }

            if ($request->filled('latitud') && $request->filled('longitud')) {
                $payload['gps_capturado_at'] = \Carbon\Carbon::now();
            }
            $cliente = Cliente::create($payload);

            VendedorCliente::create([
                'id_vendedor_mobile' => $vendedor->id,
                'id_cliente'         => $cliente->id_cliente,
                'fecha_asignacion'   => \Carbon\Carbon::now(),
            ]);

            DB::table('mobile_sync_log')->insert([
                'id_vendedor_mobile' => $vendedor->id,
                'tipo'               => 'cliente_nuevo',
                'accion'             => 'crear',
                'id_referencia'      => $cliente->id_cliente,
                'estado'             => 'ok',
                'detalle'            => "Cliente {$codigo} creado desde móvil",
                'fecha'              => \Carbon\Carbon::now(),
            ]);

            DB::commit();

            return response()->json([
                'error'   => false,
                'mensaje' => 'Cliente creado',
                'cliente' => $cliente,
            ], 201);

        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'error'   => true,
                'mensaje' => 'Error al crear cliente',
                'detalle' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT /api/clientes/{id}
     * Reglas:
     *  - Vendedor sin can_edit_clients → 403
     *  - Si el cliente es PROPIO del vendedor (él lo creó) → puede editar TODO
     *  - Si el cliente es ASIGNADO (no lo creó él) → solo campos "no sensibles"
     *  - Campos fiscales (tipo/numero doc, DV, responsabilidad, régimen, organización, cupo)
     *    solo son editables si es propio
     */
    private const CAMPOS_NO_SENSIBLES = [
        'nombre_razon_social',
        'telefono',
        'celular',
        'email',
        'direccion',
        'departamento',
        'municipio',
        'id_municipio',
        'id_departamento',
        'latitud',
        'longitud',
        'precision_gps_metros',
    ];

    private const CAMPOS_SENSIBLES = [
        'tipo_documento',
        'numero_documento',
        'digito_verificacion',
        'tipo_responsabilidad',
        'regimen_tributario',
        'tipo_organizacion',
        'cupo_autorizado',
    ];

    public function update(Request $request, int $id): JsonResponse
    {
        $vendedor = Auth::user();

        if (!$vendedor->can_edit_clients) {
            return response()->json([
                'error'   => true,
                'mensaje' => 'No tienes permisos para editar clientes',
            ], 403);
        }

        $cliente = Cliente::where('id_cliente', $id)
            ->where('id_empresa', $vendedor->id_empresa)
            ->first();

        if (!$cliente) {
            return response()->json(['error' => true, 'mensaje' => 'Cliente no encontrado'], 404);
        }

        $asignado = VendedorCliente::where('id_vendedor_mobile', $vendedor->id)
            ->where('id_cliente', $id)
            ->exists();
        if (!$asignado) {
            return response()->json(['error' => true, 'mensaje' => 'Cliente no asignado a este vendedor'], 403);
        }

        $isOwn = ((int) $cliente->creado_por_vendedor_mobile === (int) $vendedor->id);
        $allowed = $isOwn
            ? array_merge(self::CAMPOS_NO_SENSIBLES, self::CAMPOS_SENSIBLES)
            : self::CAMPOS_NO_SENSIBLES;

        $rules = [
            'nombre_razon_social' => 'sometimes|required|string|max:200',
            'tipo_documento'      => 'sometimes|required|string|max:10',
            'numero_documento'    => 'sometimes|required|string|max:30',
            'digito_verificacion' => 'sometimes|nullable|string|max:5',
            'telefono'            => 'sometimes|nullable|string|max:50',
            'celular'             => 'sometimes|nullable|string|max:50',
            'email'               => 'sometimes|nullable|email|max:150',
            'direccion'           => 'sometimes|nullable|string|max:300',
            'departamento'        => 'sometimes|nullable|string|max:100',
            'municipio'           => 'sometimes|nullable|string|max:100',
            'id_municipio'        => 'sometimes|nullable|integer|exists:municipalities,id',
            'tipo_responsabilidad' => 'sometimes|nullable|string|max:10',
            'regimen_tributario'  => 'sometimes|nullable|string|max:10',
            'tipo_organizacion'   => 'sometimes|nullable|string|max:10',
            'cupo_autorizado'     => 'sometimes|nullable|numeric|min:0',
            'latitud'             => 'sometimes|nullable|numeric|between:-90,90',
            'longitud'            => 'sometimes|nullable|numeric|between:-180,180',
            'precision_gps_metros' => 'sometimes|nullable|numeric|min:0',
        ];
        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return response()->json([
                'error'   => true,
                'mensaje' => 'Datos inválidos',
                'errores' => $validator->errors(),
            ], 422);
        }

        // Detectar si el request contiene campos no permitidos para este vendedor
        $rechazados = array_intersect(array_keys($request->all()), self::CAMPOS_SENSIBLES);
        if (!$isOwn && !empty($rechazados)) {
            return response()->json([
                'error'   => true,
                'mensaje' => 'No puedes editar campos fiscales de un cliente que no creaste',
                'campos_rechazados' => array_values($rechazados),
            ], 403);
        }

        $patch = $request->only($allowed);

        if (empty($patch)) {
            return response()->json([
                'error'   => true,
                'mensaje' => 'Sin campos para actualizar',
            ], 422);
        }

        // Si viene id_municipio, resolver nombres denormalizados
        if (array_key_exists('id_municipio', $patch) && $patch['id_municipio'] !== null) {
            $muni = DB::table('municipalities as m')
                ->leftJoin('departments as d', 'm.department_id', '=', 'd.id')
                ->where('m.id', (int) $patch['id_municipio'])
                ->select('m.id', 'm.name as mname', 'd.id as did', 'd.name as dname')
                ->first();
            if ($muni) {
                $patch['municipio']       = $muni->mname;
                $patch['id_departamento'] = $muni->did;
                $patch['departamento']    = $muni->dname;
            }
        }

        // Si viene nueva captura GPS, actualizar timestamp
        if (array_key_exists('latitud', $patch) && array_key_exists('longitud', $patch)
            && $patch['latitud'] !== null && $patch['longitud'] !== null) {
            $patch['gps_capturado_at'] = \Carbon\Carbon::now();
        }

        // Snapshot de antes/después para auditoría
        $cambios = [];
        foreach ($patch as $k => $v) {
            $before = $cliente->{$k};
            $after = $v;
            if ((string) $before !== (string) $after) {
                $cambios[$k] = ['antes' => $before, 'despues' => $after];
            }
        }

        if (empty($cambios)) {
            return response()->json([
                'error'   => false,
                'mensaje' => 'Sin cambios',
                'cliente' => $cliente,
            ]);
        }

        try {
            DB::beginTransaction();

            $cliente->update($patch);

            DB::table('cliente_ediciones_log')->insert([
                'id_empresa'         => $vendedor->id_empresa,
                'id_cliente'         => $cliente->id_cliente,
                'id_vendedor_mobile' => $vendedor->id,
                'fuente'             => 'mobile',
                'campos_cambiados'   => json_encode($cambios, JSON_UNESCAPED_UNICODE),
                'fecha'              => \Carbon\Carbon::now(),
            ]);

            DB::table('mobile_sync_log')->insert([
                'id_vendedor_mobile' => $vendedor->id,
                'tipo'               => 'cliente_editado',
                'accion'             => $isOwn ? 'editar_propio' : 'editar_contacto',
                'id_referencia'      => $cliente->id_cliente,
                'estado'             => 'ok',
                'detalle'            => count($cambios) . ' campo(s) modificado(s)',
                'fecha'              => \Carbon\Carbon::now(),
            ]);

            DB::commit();

            $cliente->refresh();
            $cliente->is_own = $isOwn;

            return response()->json([
                'error'   => false,
                'mensaje' => 'Cliente actualizado',
                'cliente' => $cliente,
                'cambios' => $cambios,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'error'   => true,
                'mensaje' => 'Error al actualizar cliente',
                'detalle' => $e->getMessage(),
            ], 500);
        }
    }
}
