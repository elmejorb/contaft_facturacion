<?php

namespace App\Http\Controllers;

use App\Models\Empresa;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

/**
 * Endpoints de sincronización para vendedores móviles y pull de ventas.
 * NO usa JWT: autentica por email + token_api (body para POST, query para GET).
 */
class SyncVendedorController extends Controller
{
    // ========================================================================
    // AUTH helpers
    // ========================================================================

    /**
     * Valida email + token_api y devuelve la empresa; o null si inválido.
     * Lee del body (POST) o de query params (GET).
     */
    private function authBatch(Request $request): ?Empresa
    {
        $email = (string) ($request->input('email', '') ?: $request->query('email', ''));
        $token = (string) ($request->input('token_api', '') ?: $request->query('token_api', ''));
        if (!$email || !$token) return null;

        return Empresa::where('email', $email)
            ->where('token_api', $token)
            ->first();
    }

    private function unauthorized(): JsonResponse
    {
        return response()->json([
            'error'   => true,
            'mensaje' => 'Credenciales inválidas (email o token_api)',
        ], 401);
    }

    private function logBatch(
        int $empresaId,
        string $entidad,
        int $recibidos,
        int $insertados,
        int $actualizados,
        int $errores,
        ?string $ultimoError = null,
    ): void {
        DB::table('sync_batch_log')->insert([
            'id_empresa'    => $empresaId,
            'entidad'       => $entidad,
            'fuente'        => 'electron',
            'recibidos'     => $recibidos,
            'insertados'    => $insertados,
            'actualizados'  => $actualizados,
            'errores'       => $errores,
            'ultimo_error'  => $ultimoError,
            'fecha'         => \Carbon\Carbon::now(),
        ]);
    }

    // ========================================================================
    // VENDEDORES BATCH (POST /sync/vendedores/batch)
    // ========================================================================

    public function vendedoresBatch(Request $request): JsonResponse
    {
        $empresa = $this->authBatch($request);
        if (!$empresa) return $this->unauthorized();

        $registros = $request->input('registros', []);
        if (!is_array($registros)) {
            return response()->json(['error' => true, 'mensaje' => 'registros debe ser array'], 422);
        }
        if (count($registros) > 200) {
            return response()->json(['error' => true, 'mensaje' => 'Máximo 200 registros por batch'], 422);
        }

        $insertados = 0;
        $actualizados = 0;
        $errores = [];
        $ultimoError = null;

        DB::beginTransaction();
        try {
            foreach ($registros as $idx => $r) {
                $idConta = isset($r['id_vendedor_conta']) ? (int) $r['id_vendedor_conta'] : 0;
                $codigo  = (string) ($r['codigo'] ?? '');
                $nombre  = (string) ($r['nombre'] ?? '');
                $emailV  = (string) ($r['email_vendedor'] ?? $r['email'] ?? '');

                if ($idConta === 0 || $codigo === '' || $nombre === '' || $emailV === '') {
                    $errores[] = ['idx' => $idx, 'mensaje' => 'id_vendedor_conta, codigo, nombre y email_vendedor son obligatorios'];
                    $ultimoError = "idx=$idx: campos obligatorios faltantes";
                    continue;
                }

                $data = [
                    'id_empresa'        => $empresa->id_empresa,
                    'id_vendedor_conta' => $idConta,
                    'codigo'            => $codigo,
                    'nombre'            => $nombre,
                    'email'             => $emailV,
                    'password'          => $r['password_hash'] ?? ($r['password'] ?? ''),
                    'telefono'          => $r['telefono'] ?? null,
                    'cedula'            => $r['cedula'] ?? null,
                    'zona'              => $r['zona'] ?? null,
                    'can_edit_clients'  => isset($r['can_edit_clients']) ? (bool) $r['can_edit_clients'] : true,
                    'activo'            => isset($r['activo']) ? (bool) $r['activo'] : true,
                    'updated_at'        => \Carbon\Carbon::now(),
                ];

                // Upsert por id_vendedor_conta + id_empresa
                $existing = DB::table('mobile_vendedores')
                    ->where('id_empresa', $empresa->id_empresa)
                    ->where('id_vendedor_conta', $idConta)
                    ->first();

                if ($existing) {
                    DB::table('mobile_vendedores')
                        ->where('id', $existing->id)
                        ->update($data);
                    $actualizados++;
                } else {
                    $data['created_at'] = \Carbon\Carbon::now();
                    DB::table('mobile_vendedores')->insert($data);
                    $insertados++;
                }
            }
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'error'   => true,
                'mensaje' => 'Error procesando vendedores',
                'detalle' => $e->getMessage(),
            ], 500);
        }

        $this->logBatch(
            $empresa->id_empresa,
            'vendedores',
            count($registros),
            $insertados,
            $actualizados,
            count($errores),
            $ultimoError,
        );

        return response()->json([
            'error'             => false,
            'insertados'        => $insertados,
            'actualizados'      => $actualizados,
            'total_procesados'  => $insertados + $actualizados,
            'total_errores'     => count($errores),
            'errores'           => $errores,
        ]);
    }

    // ========================================================================
    // VENTAS PENDIENTES (GET /sync/ventas/pendientes)
    // ========================================================================

    public function ventasPendientes(Request $request): JsonResponse
    {
        $empresa = $this->authBatch($request);
        if (!$empresa) return $this->unauthorized();

        $afterId = (int) $request->query('after_id', 0);
        $perPage = min((int) $request->query('per_page', 100), 500);

        // Ventas de la empresa con id_venta > after_id, ordenadas asc para pull incremental
        $ventas = DB::table('ventas as v')
            ->select([
                'v.id_venta',
                'v.numero_factura',
                'v.fecha_venta',
                'v.id_cliente',
                'c.nombre_razon_social as nombre_cliente',
                'c.numero_documento as nit_cliente',
                'v.id_vendedor_mobile',
                'mv.nombre as nombre_vendedor',
                'v.subtotal',
                'v.total_impuestos',
                'v.descuento',
                'v.total',
                'v.forma_pago',
                'v.observaciones',
                'v.origen',
                'v.estado',
                'v.cufe',
                'v.estado_dian',
                'v.created_at',
            ])
            ->leftJoin('clientes as c', function ($join) use ($empresa) {
                $join->on('v.id_cliente', '=', 'c.id_cliente')
                     ->where('c.id_empresa', '=', $empresa->id_empresa);
            })
            ->leftJoin('mobile_vendedores as mv', function ($join) use ($empresa) {
                $join->on('v.id_vendedor_mobile', '=', 'mv.id')
                     ->where('mv.id_empresa', '=', $empresa->id_empresa);
            })
            ->where('v.id_empresa', $empresa->id_empresa)
            ->where('v.id_venta', '>', $afterId)
            // Solo ventas creadas desde la app móvil (por vendedor) o con origen mobile
            ->where(function ($q) {
                $q->whereNotNull('v.id_vendedor_mobile')
                  ->orWhere('v.origen', 'mobile');
            })
            ->orderBy('v.id_venta', 'asc')
            ->limit($perPage)
            ->get();

        // Obtener IDs de ventas para cargar detalles en batch
        $ventaIds = $ventas->pluck('id_venta')->toArray();
        $detallesMap = [];

        if (!empty($ventaIds)) {
            $detalles = DB::table('venta_detalles')
                ->whereIn('id_venta', $ventaIds)
                ->orderBy('id_detalle', 'asc')
                ->get();

            foreach ($detalles as $d) {
                $detallesMap[$d->id_venta][] = [
                    'id_producto'     => $d->id_producto,
                    'nombre_producto' => $d->nombre_producto,
                    'cantidad'        => (float) $d->cantidad,
                    'precio_unitario' => (float) $d->precio_unitario,
                    'subtotal'        => (float) $d->subtotal,
                    'descuento'       => (float) $d->descuento,
                    'porcentaje_iva'  => (float) $d->porcentaje_iva,
                    'impuesto'        => (float) $d->impuesto,
                    'total'           => (float) $d->total,
                ];
            }
        }

        $resultado = [];
        foreach ($ventas as $v) {
            $resultado[] = [
                'id_venta'           => (int) $v->id_venta,
                'numero_factura'     => $v->numero_factura,
                'fecha_venta'        => $v->fecha_venta,
                'id_cliente'         => (int) $v->id_cliente,
                'nombre_cliente'     => $v->nombre_cliente ?? 'Cliente general',
                'nit_cliente'        => $v->nit_cliente ?? '',
                'id_vendedor_mobile' => $v->id_vendedor_mobile ? (int) $v->id_vendedor_mobile : null,
                'nombre_vendedor'    => $v->nombre_vendedor ?? '',
                'subtotal'           => (float) $v->subtotal,
                'total_impuestos'    => (float) $v->total_impuestos,
                'descuento'          => (float) $v->descuento,
                'total'              => (float) $v->total,
                'forma_pago'         => $v->forma_pago,
                'observaciones'      => $v->observaciones ?? '',
                'origen'             => $v->origen,
                'estado'             => $v->estado,
                'cufe'               => $v->cufe,
                'estado_dian'        => $v->estado_dian,
                'detalles'           => $detallesMap[$v->id_venta] ?? [],
            ];
        }

        return response()->json([
            'error'      => false,
            'ventas'     => $resultado,
            'total'      => count($resultado),
            'after_id'   => $afterId,
            'next_after_id' => !empty($resultado) ? end($resultado)['id_venta'] : $afterId,
        ]);
    }

    // ========================================================================
    // EDICIONES DE CLIENTES PENDIENTES (GET /sync/clientes/ediciones-pendientes)
    // Devuelve todas las ediciones aún no aplicadas al desktop. El desktop
    // decide qué hacer con cada una; las que correspondan a clientes sin
    // codvb6 (creados en móvil) las aplicará una vez se mapee el cliente vía
    // /sync/clientes/nuevos + /sync/clientes/confirmar-mapeo.
    // ========================================================================
    public function clientesEdicionesPendientes(Request $request): JsonResponse
    {
        $empresa = $this->authBatch($request);
        if (!$empresa) return $this->unauthorized();

        $perPage = min((int) $request->query('per_page', 200), 500);

        $ediciones = DB::table('cliente_ediciones_log as e')
            ->select([
                'e.id',
                'e.id_cliente',
                'e.id_vendedor_mobile',
                'e.fuente',
                'e.campos_cambiados',
                'e.fecha',
                'c.codvb6',
                'c.codigo_cliente',
                'c.nombre_razon_social',
                'mv.codigo as codigo_vendedor',
                'mv.nombre as nombre_vendedor',
            ])
            ->leftJoin('clientes as c', 'e.id_cliente', '=', 'c.id_cliente')
            ->leftJoin('mobile_vendedores as mv', 'e.id_vendedor_mobile', '=', 'mv.id')
            ->where('e.id_empresa', $empresa->id_empresa)
            ->where('e.sincronizado_desktop', 0)
            ->orderBy('e.id', 'asc')
            ->limit($perPage)
            ->get();

        $resultado = [];
        foreach ($ediciones as $e) {
            $cambios = json_decode($e->campos_cambiados, true) ?: [];
            $resultado[] = [
                'id_edicion'           => (int) $e->id,
                'id_cliente'           => (int) $e->id_cliente,
                'codvb6'               => $e->codvb6,           // CodigoClien en desktop
                'codigo_cliente'       => $e->codigo_cliente,
                'nombre_razon_social'  => $e->nombre_razon_social,
                'codigo_vendedor'      => $e->codigo_vendedor,
                'nombre_vendedor'      => $e->nombre_vendedor,
                'fecha'                => $e->fecha,
                'fuente'               => $e->fuente,
                'cambios'              => $cambios, // { campo: { antes, despues }, ... }
            ];
        }

        return response()->json([
            'error'     => false,
            'ediciones' => $resultado,
            'total'     => count($resultado),
        ]);
    }

    // ========================================================================
    // CONFIRMAR EDICIONES APLICADAS (POST /sync/clientes/ediciones-confirmadas)
    // Body: { email, token_api, ids: [123, 124, ...] }
    // Marca las ediciones como sincronizado_desktop=1 con timestamp.
    // ========================================================================
    public function clientesEdicionesConfirmadas(Request $request): JsonResponse
    {
        $empresa = $this->authBatch($request);
        if (!$empresa) return $this->unauthorized();

        $ids = $request->input('ids', []);
        if (!is_array($ids) || empty($ids)) {
            return response()->json([
                'error'   => true,
                'mensaje' => 'Se requiere lista de ids',
            ], 400);
        }
        $ids = array_map('intval', $ids);

        $actualizados = DB::table('cliente_ediciones_log')
            ->where('id_empresa', $empresa->id_empresa)
            ->whereIn('id', $ids)
            ->update([
                'sincronizado_desktop' => 1,
                'fecha_sync_desktop'   => date('Y-m-d H:i:s'),
            ]);

        return response()->json([
            'error'        => false,
            'actualizados' => $actualizados,
        ]);
    }

    // ========================================================================
    // ACTUALIZAR MODOS DE LA EMPRESA (POST /sync/empresa/modos)
    // El desktop manda los 3 flags (pedidos / factura POS / FE) cuando el
    // admin los cambia en Configuración. Permite que cada empresa cliente
    // configure qué pueden hacer sus vendedores desde la app.
    // Body: { email, token_api, modo_pedidos, modo_factura_pos, modo_factura_electronica }
    // ========================================================================
    public function empresaActualizarModos(Request $request): JsonResponse
    {
        $empresa = $this->authBatch($request);
        if (!$empresa) return $this->unauthorized();

        $modoPedidos = $request->input('modo_pedidos', null);
        $modoFacturaPos = $request->input('modo_factura_pos', null);
        $modoFacturaElectronica = $request->input('modo_factura_electronica', null);

        $update = [];
        if ($modoPedidos !== null)             $update['modo_pedidos'] = (int) (bool) $modoPedidos;
        if ($modoFacturaPos !== null)          $update['modo_factura_pos'] = (int) (bool) $modoFacturaPos;
        if ($modoFacturaElectronica !== null)  $update['modo_factura_electronica'] = (int) (bool) $modoFacturaElectronica;

        if (empty($update)) {
            return response()->json(['error' => true, 'mensaje' => 'No se enviaron campos a actualizar'], 400);
        }

        $update['updated_at'] = date('Y-m-d H:i:s');

        DB::table('empresas')
            ->where('id_empresa', $empresa->id_empresa)
            ->update($update);

        $actualizada = DB::table('empresas')
            ->where('id_empresa', $empresa->id_empresa)
            ->select([
                'id_empresa', 'nombre_empresa',
                'modo_pedidos', 'modo_factura_pos', 'modo_factura_electronica',
                'factura_electronica_activa',
            ])
            ->first();

        return response()->json([
            'error'   => false,
            'empresa' => $actualizada,
        ]);
    }

    // ========================================================================
    // CLIENTES NUEVOS CREADOS DESDE MÓVIL (GET /sync/clientes/nuevos)
    // Devuelve clientes con codvb6 NULL — i.e. creados directamente por un
    // vendedor en la app móvil — para que el desktop los inserte en
    // tblclientes y devuelva su CodigoClien recién asignado.
    // ========================================================================
    public function clientesNuevosPendientes(Request $request): JsonResponse
    {
        $empresa = $this->authBatch($request);
        if (!$empresa) return $this->unauthorized();

        $perPage = min((int) $request->query('per_page', 100), 300);

        $rows = DB::table('clientes as c')
            ->select([
                'c.id_cliente',
                'c.codigo_cliente',
                'c.nombre_razon_social',
                'c.tipo_documento',
                'c.numero_documento',
                'c.digito_verificacion',
                'c.telefono',
                'c.celular',
                'c.email',
                'c.direccion',
                'c.municipio',
                'c.departamento',
                'c.latitud',
                'c.longitud',
                'c.precision_gps_metros',
                'c.gps_capturado_at',
                'c.creado_por_vendedor_mobile',
                'mv.codigo as codigo_vendedor',
                'mv.nombre as nombre_vendedor',
                'c.created_at',
            ])
            ->leftJoin('mobile_vendedores as mv', 'c.creado_por_vendedor_mobile', '=', 'mv.id')
            ->where('c.id_empresa', $empresa->id_empresa)
            ->whereNull('c.codvb6')
            ->whereNotNull('c.creado_por_vendedor_mobile') // solo los que sí vienen de móvil
            ->orderBy('c.id_cliente', 'asc')
            ->limit($perPage)
            ->get();

        return response()->json([
            'error'    => false,
            'clientes' => $rows,
            'total'    => count($rows),
        ]);
    }

    // ========================================================================
    // CONFIRMAR MAPEO DE CLIENTE NUEVO (POST /sync/clientes/confirmar-mapeo)
    // El desktop insertó al cliente en tblclientes y devuelve el CodigoClien
    // asignado. Lumen guarda ese valor en `codvb6` para futuras ediciones.
    // Body: { email, token_api, mapeos: [{id_cliente, codvb6}, ...] }
    // ========================================================================
    public function clientesConfirmarMapeo(Request $request): JsonResponse
    {
        $empresa = $this->authBatch($request);
        if (!$empresa) return $this->unauthorized();

        $mapeos = $request->input('mapeos', []);
        if (!is_array($mapeos) || empty($mapeos)) {
            return response()->json([
                'error'   => true,
                'mensaje' => 'Se requiere lista de mapeos',
            ], 400);
        }

        $actualizados = 0;
        foreach ($mapeos as $m) {
            $idCliente = (int) ($m['id_cliente'] ?? 0);
            $codvb6 = (string) ($m['codvb6'] ?? '');
            if ($idCliente <= 0 || $codvb6 === '') continue;

            $n = DB::table('clientes')
                ->where('id_empresa', $empresa->id_empresa)
                ->where('id_cliente', $idCliente)
                ->whereNull('codvb6')
                ->update(['codvb6' => $codvb6, 'updated_at' => date('Y-m-d H:i:s')]);
            $actualizados += $n;
        }

        return response()->json([
            'error'        => false,
            'actualizados' => $actualizados,
        ]);
    }
}
