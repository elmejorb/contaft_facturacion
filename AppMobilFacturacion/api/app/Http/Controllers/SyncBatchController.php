<?php

namespace App\Http\Controllers;

use App\Models\Empresa;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

/**
 * Endpoints de sincronización batch para el sincronizador Electron.
 * NO usa JWT: autentica por email + token_api que se envían en el body.
 *
 * Contratos compatibles con api-conta, así el Electron solo cambia URL base.
 */
class SyncBatchController extends Controller
{
    // ========================================================================
    // AUTH helpers
    // ========================================================================

    /**
     * Valida email + token_api del body y devuelve la empresa; o null si inválido.
     */
    private function authBatch(Request $request): ?Empresa
    {
        $email = (string) $request->input('email', '');
        $token = (string) $request->input('token_api', '');
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
    // VALIDACIÓN (2 endpoints: /sync/electron/validar y /sync/validar)
    // ========================================================================

    public function validar(Request $request): JsonResponse
    {
        $v = Validator::make($request->all(), [
            'email'     => 'required|email',
            'token_api' => 'required|string',
        ]);
        if ($v->fails()) {
            return response()->json(['error' => true, 'mensaje' => 'Datos inválidos'], 422);
        }

        $empresa = $this->authBatch($request);
        if (!$empresa) return $this->unauthorized();

        return response()->json([
            'error'   => false,
            'mensaje' => 'Credenciales válidas',
            'empresa' => [
                'id_empresa'     => $empresa->id_empresa,
                'nombre_empresa' => $empresa->nombre_empresa,
                'nit_empresa'    => $empresa->nit,
                'email'          => $empresa->email,
            ],
        ]);
    }

    // ========================================================================
    // CATEGORIAS
    // ========================================================================

    public function categoriasBatch(Request $request): JsonResponse
    {
        $empresa = $this->authBatch($request);
        if (!$empresa) return $this->unauthorized();

        $registros = $request->input('registros', []);
        if (!is_array($registros)) {
            return response()->json(['error' => true, 'mensaje' => 'registros debe ser array'], 422);
        }
        if (count($registros) > 100) {
            return response()->json(['error' => true, 'mensaje' => 'Máximo 100 registros por batch'], 422);
        }

        $insertados = 0;
        $actualizados = 0;
        $errores = [];
        $ultimoError = null;

        DB::beginTransaction();
        try {
            foreach ($registros as $idx => $r) {
                $codvb6 = (string) ($r['codigo'] ?? '');
                $nombre = (string) ($r['nombre_categoria'] ?? $r['nombre'] ?? '');
                if ($codvb6 === '' || $nombre === '') {
                    $errores[] = ['idx' => $idx, 'mensaje' => 'codigo y nombre son obligatorios'];
                    $ultimoError = "idx=$idx: codigo/nombre obligatorios";
                    continue;
                }

                $existing = DB::table('categorias')
                    ->where('id_empresa', $empresa->id_empresa)
                    ->where('codvb6', $codvb6)
                    ->first();

                if ($existing) {
                    DB::table('categorias')
                        ->where('id_categoria', $existing->id_categoria)
                        ->update([
                            'nombre'     => $nombre,
                            'estado'     => isset($r['estado']) ? (bool) $r['estado'] : true,
                            'updated_at' => \Carbon\Carbon::now(),
                        ]);
                    $actualizados++;
                } else {
                    DB::table('categorias')->insert([
                        'id_empresa' => $empresa->id_empresa,
                        'codvb6'     => $codvb6,
                        'nombre'     => $nombre,
                        'estado'     => isset($r['estado']) ? (bool) $r['estado'] : true,
                        'created_at' => \Carbon\Carbon::now(),
                        'updated_at' => \Carbon\Carbon::now(),
                    ]);
                    $insertados++;
                }
            }
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'error'   => true,
                'mensaje' => 'Error procesando categorías',
                'detalle' => $e->getMessage(),
            ], 500);
        }

        $this->logBatch(
            $empresa->id_empresa,
            'categorias',
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
    // PRODUCTOS
    // ========================================================================

    public function productosBatch(Request $request): JsonResponse
    {
        $empresa = $this->authBatch($request);
        if (!$empresa) return $this->unauthorized();

        $registros = $request->input('registros', []);
        if (!is_array($registros) || count($registros) > 200) {
            return response()->json(['error' => true, 'mensaje' => 'registros inválido (máx 200)'], 422);
        }

        $insertados = 0;
        $actualizados = 0;
        $errores = [];
        $ultimoError = null;

        DB::beginTransaction();
        try {
            foreach ($registros as $idx => $r) {
                $codvb6 = (string) ($r['codigo'] ?? '');
                $nombre = (string) ($r['nombre_pro'] ?? $r['nombre'] ?? '');
                if ($codvb6 === '' || $nombre === '') {
                    $errores[] = ['idx' => $idx, 'mensaje' => 'codigo y nombre_pro obligatorios'];
                    $ultimoError = "idx=$idx: codigo/nombre_pro obligatorios";
                    continue;
                }

                // Resolver id_categoria desde cod_categoria si viene
                $idCategoria = null;
                if (!empty($r['cod_categoria'])) {
                    $idCategoria = DB::table('categorias')
                        ->where('id_empresa', $empresa->id_empresa)
                        ->where('codvb6', (string) $r['cod_categoria'])
                        ->value('id_categoria');
                }

                $data = [
                    'id_empresa'       => $empresa->id_empresa,
                    'id_categoria'     => $idCategoria,
                    'codigo'           => $codvb6,
                    'nombre'           => $nombre,
                    'precio_costo'     => (float) ($r['precio_costo'] ?? 0),
                    'precio_venta'     => (float) ($r['precio_venta1'] ?? $r['precio_venta'] ?? 0),
                    'precio_venta_2'   => (float) ($r['precio_venta2'] ?? 0),
                    'precio_venta_3'   => (float) ($r['precio_venta3'] ?? 0),
                    'stock'            => (float) ($r['existencia'] ?? 0),
                    'stock_minimo'     => (float) ($r['existencia_min'] ?? 0),
                    'porcentaje_iva'   => (float) ($r['iva'] ?? 19),
                    'estado'           => isset($r['estado']) ? (bool) $r['estado'] : true,
                    'updated_at'       => \Carbon\Carbon::now(),
                ];

                $existing = DB::table('productos')
                    ->where('id_empresa', $empresa->id_empresa)
                    ->where('codvb6', $codvb6)
                    ->first();

                if ($existing) {
                    DB::table('productos')
                        ->where('id_producto', $existing->id_producto)
                        ->update($data);
                    $actualizados++;
                } else {
                    $data['codvb6']     = $codvb6;
                    $data['created_at'] = \Carbon\Carbon::now();
                    DB::table('productos')->insert($data);
                    $insertados++;
                }
            }
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'error'   => true,
                'mensaje' => 'Error procesando productos',
                'detalle' => $e->getMessage(),
            ], 500);
        }

        $this->logBatch(
            $empresa->id_empresa,
            'productos',
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
    // CLIENTES
    // ========================================================================

    private const DOC_MAP = [
        1 => 'CC', 2 => 'NIT', 3 => 'CE', 4 => 'TI', 5 => 'PP',
    ];

    public function clientesBatch(Request $request): JsonResponse
    {
        $empresa = $this->authBatch($request);
        if (!$empresa) return $this->unauthorized();

        $registros = $request->input('registros', []);
        if (!is_array($registros) || count($registros) > 200) {
            return response()->json(['error' => true, 'mensaje' => 'registros inválido (máx 200)'], 422);
        }

        $insertados = 0;
        $actualizados = 0;
        $errores = [];
        $ultimoError = null;

        DB::beginTransaction();
        try {
            foreach ($registros as $idx => $r) {
                $codvb6 = (string) ($r['codigo'] ?? '');
                $razon  = (string) ($r['razon_social'] ?? '');
                if ($codvb6 === '' || $razon === '') {
                    $errores[] = ['idx' => $idx, 'mensaje' => 'codigo y razon_social obligatorios'];
                    $ultimoError = "idx=$idx: codigo/razon_social obligatorios";
                    continue;
                }

                $tipoDoc = null;
                if (isset($r['id_documento'])) {
                    $tipoDoc = self::DOC_MAP[(int) $r['id_documento']] ?? null;
                }

                $data = [
                    'id_empresa'           => $empresa->id_empresa,
                    'codigo_cliente'       => $codvb6,
                    'nombre_razon_social'  => $razon,
                    'tipo_documento'       => $tipoDoc,
                    'numero_documento'     => isset($r['nit']) ? (string) $r['nit'] : null,
                    'telefono'             => $r['telefonos']   ?? null,
                    'celular'              => $r['celular']     ?? ($r['ceular'] ?? null),
                    'email'                => $r['email_cliente'] ?? null,
                    'direccion'            => $r['direccion']   ?? null,
                    'municipio'            => $r['id_municipio'] ?? null,
                    'tipo_responsabilidad' => $r['id_type_liability'] ?? null,
                    'tipo_organizacion'    => $r['id_type_organization'] ?? null,
                    'regimen_tributario'   => $r['id_type_regime']  ?? null,
                    'cupo_autorizado'      => (float) ($r['cupo_autorizado'] ?? 0),
                    'estado'               => true,
                    'updated_at'           => \Carbon\Carbon::now(),
                ];

                $existing = DB::table('clientes')
                    ->where('id_empresa', $empresa->id_empresa)
                    ->where('codvb6', $codvb6)
                    ->first();

                if ($existing) {
                    DB::table('clientes')
                        ->where('id_cliente', $existing->id_cliente)
                        ->update($data);
                    $actualizados++;
                } else {
                    $data['codvb6']     = $codvb6;
                    $data['created_at'] = \Carbon\Carbon::now();
                    DB::table('clientes')->insert($data);
                    $insertados++;
                }
            }
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'error'   => true,
                'mensaje' => 'Error procesando clientes',
                'detalle' => $e->getMessage(),
            ], 500);
        }

        $this->logBatch(
            $empresa->id_empresa,
            'clientes',
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
    // PROVEEDORES
    // ========================================================================

    public function proveedoresBatch(Request $request): JsonResponse
    {
        $empresa = $this->authBatch($request);
        if (!$empresa) return $this->unauthorized();

        $registros = $request->input('registros', []);
        if (!is_array($registros) || count($registros) > 200) {
            return response()->json(['error' => true, 'mensaje' => 'registros inválido (máx 200)'], 422);
        }

        $insertados = 0;
        $actualizados = 0;
        $errores = [];

        DB::beginTransaction();
        try {
            foreach ($registros as $idx => $r) {
                $codvb6 = (string) ($r['CodigoPro'] ?? $r['codigo'] ?? '');
                $razon  = (string) ($r['RazonSocial'] ?? $r['razon_social'] ?? '');
                if ($codvb6 === '' || $razon === '') {
                    $errores[] = ['idx' => $idx, 'mensaje' => 'CodigoPro y RazonSocial obligatorios'];
                    continue;
                }

                $data = [
                    'id_empresa'               => $empresa->id_empresa,
                    'codigo_proveedor'         => $codvb6,
                    'razon_social'             => $razon,
                    'nit'                      => $r['Nit']         ?? null,
                    'telefonos'                => $r['Telefonos']   ?? null,
                    'email'                    => $r['Email']       ?? null,
                    'direccion'                => $r['Direccion']   ?? null,
                    'nombres_contacto'         => $r['Nombres']     ?? null,
                    'apellidos_contacto'       => $r['Apellidos']   ?? null,
                    'identificacion_contacto'  => $r['Identificacion'] ?? null,
                    'telefonos_contacto'       => $r['TelefonosContacto'] ?? null,
                    'direccion_contacto'       => $r['DireccionContacto'] ?? null,
                    'cuenta_numero'            => $r['CuentaNumero'] ?? null,
                    'estado'                   => true,
                    'updated_at'               => \Carbon\Carbon::now(),
                ];

                $existing = DB::table('proveedores')
                    ->where('id_empresa', $empresa->id_empresa)
                    ->where('codvb6', $codvb6)
                    ->first();

                if ($existing) {
                    DB::table('proveedores')
                        ->where('id_proveedor', $existing->id_proveedor)
                        ->update($data);
                    $actualizados++;
                } else {
                    $data['codvb6']     = $codvb6;
                    $data['created_at'] = \Carbon\Carbon::now();
                    DB::table('proveedores')->insert($data);
                    $insertados++;
                }
            }
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'error' => true, 'mensaje' => 'Error procesando proveedores', 'detalle' => $e->getMessage(),
            ], 500);
        }

        $this->logBatch($empresa->id_empresa, 'proveedores', count($registros), $insertados, $actualizados, count($errores));

        return response()->json([
            'error'            => false,
            'insertados'       => $insertados,
            'actualizados'     => $actualizados,
            'total_procesados' => $insertados + $actualizados,
            'total_errores'    => count($errores),
            'errores'          => $errores,
        ]);
    }

    // ========================================================================
    // VENTAS (con detalles)
    // ========================================================================

    public function ventasBatch(Request $request): JsonResponse
    {
        $empresa = $this->authBatch($request);
        if (!$empresa) return $this->unauthorized();

        $registros = $request->input('registros', []);
        if (!is_array($registros) || count($registros) > 100) {
            return response()->json(['error' => true, 'mensaje' => 'registros inválido (máx 100)'], 422);
        }

        $insertados = 0;
        $actualizados = 0;
        $errores = [];
        $ultimoError = null;

        DB::beginTransaction();
        try {
            foreach ($registros as $idx => $r) {
                $codvb6 = (string) ($r['Factura_N'] ?? '');
                if ($codvb6 === '') {
                    $errores[] = ['idx' => $idx, 'mensaje' => 'Factura_N obligatorio'];
                    continue;
                }

                // Resolver id_cliente desde CodigoCli
                $idCliente = null;
                if (!empty($r['CodigoCli'])) {
                    $idCliente = DB::table('clientes')
                        ->where('id_empresa', $empresa->id_empresa)
                        ->where('codvb6', (string) $r['CodigoCli'])
                        ->value('id_cliente');
                }

                $total       = (float) ($r['Total']     ?? 0);
                $impuesto    = (float) ($r['Impuesto']  ?? 0);
                $descuento   = (float) ($r['Descuento'] ?? 0);
                $subtotal    = $total - $impuesto + $descuento;

                $data = [
                    'id_empresa'       => $empresa->id_empresa,
                    'id_cliente'       => $idCliente ?? 0,
                    'numero_factura'   => $codvb6,
                    'fecha_venta'      => !empty($r['Fecha']) ? $this->parseDate($r['Fecha']) : \Carbon\Carbon::now()->toDateString(),
                    'subtotal'         => $subtotal,
                    'total_impuestos'  => $impuesto,
                    'descuento'        => $descuento,
                    'total'            => $total,
                    'forma_pago'       => strtolower((string) ($r['Tipo'] ?? 'contado')),
                    'observaciones'    => $r['Comentario'] ?? null,
                    'origen'           => 'electron',
                    'estado'           => (string) ($r['EstadoFact'] ?? 'registrada'),
                    'updated_at'       => \Carbon\Carbon::now(),
                ];

                $existing = DB::table('ventas')
                    ->where('id_empresa', $empresa->id_empresa)
                    ->where('codvb6', $codvb6)
                    ->first();

                $idVenta = null;
                if ($existing) {
                    DB::table('ventas')
                        ->where('id_venta', $existing->id_venta)
                        ->update($data);
                    $idVenta = $existing->id_venta;
                    $actualizados++;
                } else {
                    $data['codvb6']     = $codvb6;
                    $data['created_at'] = \Carbon\Carbon::now();
                    $idVenta = DB::table('ventas')->insertGetId($data);
                    $insertados++;
                }

                // Detalles: borrar los previos y reinsertar
                if (!empty($r['detalles']) && is_array($r['detalles'])) {
                    DB::table('venta_detalles')->where('id_venta', $idVenta)->delete();
                    foreach ($r['detalles'] as $d) {
                        $codProd = (string) ($d['codigo_producto'] ?? '');
                        $prod = DB::table('productos')
                            ->where('id_empresa', $empresa->id_empresa)
                            ->where('codvb6', $codProd)
                            ->first();

                        $cantidad  = (float) ($d['cantidad']       ?? 0);
                        $precio    = (float) ($d['valor_unitario'] ?? 0);
                        $subt      = $cantidad * $precio;

                        DB::table('venta_detalles')->insert([
                            'id_venta'        => $idVenta,
                            'id_producto'     => $prod->id_producto ?? 0,
                            'nombre_producto' => $prod->nombre ?? ($d['nombre'] ?? 'Producto'),
                            'cantidad'        => $cantidad,
                            'precio_unitario' => $precio,
                            'subtotal'        => $subt,
                            'descuento'       => 0,
                            'porcentaje_iva'  => 19,
                            'impuesto'        => 0,
                            'total'           => $subt,
                            'created_at'      => \Carbon\Carbon::now(),
                            'updated_at'      => \Carbon\Carbon::now(),
                        ]);
                    }
                }
            }
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'error' => true, 'mensaje' => 'Error procesando ventas', 'detalle' => $e->getMessage(),
            ], 500);
        }

        $this->logBatch($empresa->id_empresa, 'ventas', count($registros), $insertados, $actualizados, count($errores), $ultimoError);

        return response()->json([
            'error'            => false,
            'insertados'       => $insertados,
            'actualizados'     => $actualizados,
            'total_procesados' => $insertados + $actualizados,
            'total_errores'    => count($errores),
            'errores'          => $errores,
        ]);
    }

    // ========================================================================
    // PAGOS
    // ========================================================================

    public function pagosBatch(Request $request): JsonResponse
    {
        $empresa = $this->authBatch($request);
        if (!$empresa) return $this->unauthorized();

        $registros = $request->input('registros', []);
        if (!is_array($registros) || count($registros) > 500) {
            return response()->json(['error' => true, 'mensaje' => 'registros inválido (máx 500)'], 422);
        }

        $insertados = 0;
        $actualizados = 0;
        $errores = [];

        DB::beginTransaction();
        try {
            foreach ($registros as $idx => $r) {
                $idVb6 = (int) ($r['Id_Pagos'] ?? 0);
                if ($idVb6 === 0) {
                    $errores[] = ['idx' => $idx, 'mensaje' => 'Id_Pagos obligatorio'];
                    continue;
                }

                $data = [
                    'id_empresa'     => $empresa->id_empresa,
                    'recibo_caja'    => $r['RecCajaN']      ?? null,
                    'codigo_cliente' => $r['Codigo']        ?? null,
                    'numero_factura' => $r['Fact_N']        ?? null,
                    'valor_pago'     => (float) ($r['ValorPago'] ?? 0),
                    'fecha'          => !empty($r['Fecha']) ? $this->parseDate($r['Fecha']) : null,
                    'detalle_pago'   => $r['DetallePago']   ?? null,
                    'valor_factura'  => (float) ($r['ValorFact']  ?? 0),
                    'saldo_actual'   => (float) ($r['SaldoAct']   ?? 0),
                    'descuento'      => (float) ($r['Descuento']  ?? 0),
                    'retencion'      => (float) ($r['Retencion']  ?? 0),
                    'iva_retenido'   => (float) ($r['IVARetenido']?? 0),
                    'saldo_total'    => (float) ($r['SaldoTotal'] ?? 0),
                    'estado'         => $r['Estado']        ?? null,
                    'cedula'         => $r['Cedula']        ?? null,
                    'recibido_de'    => $r['RecibidoDe']    ?? null,
                    'updated_at'     => \Carbon\Carbon::now(),
                ];

                $existing = DB::table('pagos')
                    ->where('id_empresa', $empresa->id_empresa)
                    ->where('id_pago_vb6', $idVb6)
                    ->first();

                if ($existing) {
                    DB::table('pagos')->where('id_pago', $existing->id_pago)->update($data);
                    $actualizados++;
                } else {
                    $data['id_pago_vb6'] = $idVb6;
                    $data['created_at']  = \Carbon\Carbon::now();
                    DB::table('pagos')->insert($data);
                    $insertados++;
                }
            }
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'error' => true, 'mensaje' => 'Error procesando pagos', 'detalle' => $e->getMessage(),
            ], 500);
        }

        $this->logBatch($empresa->id_empresa, 'pagos', count($registros), $insertados, $actualizados, count($errores));

        return response()->json([
            'error'            => false,
            'insertados'       => $insertados,
            'actualizados'     => $actualizados,
            'total_procesados' => $insertados + $actualizados,
            'total_errores'    => count($errores),
            'errores'          => $errores,
        ]);
    }

    // ========================================================================
    // SALDOS DE CARTERA
    // ========================================================================

    public function saldosBatch(Request $request): JsonResponse
    {
        $empresa = $this->authBatch($request);
        if (!$empresa) return $this->unauthorized();

        $tipo = (string) ($request->input('tipo', 'cliente'));
        if (!in_array($tipo, ['cliente', 'proveedor'])) {
            return response()->json(['error' => true, 'mensaje' => 'tipo debe ser cliente o proveedor'], 422);
        }

        $registros = $request->input('registros', []);
        $resetSaldos = (bool) $request->input('reset_saldos', false);

        if (!is_array($registros) || count($registros) > 500) {
            return response()->json(['error' => true, 'mensaje' => 'registros inválido (máx 500)'], 422);
        }

        $insertados = 0;
        $actualizados = 0;

        DB::beginTransaction();
        try {
            if ($resetSaldos) {
                DB::table('saldo_cartera')
                    ->where('id_empresa', $empresa->id_empresa)
                    ->where('tipo', $tipo)
                    ->update(['saldo_total' => 0, 'updated_at' => \Carbon\Carbon::now()]);
            }

            foreach ($registros as $r) {
                $codigo = (string) ($r['CodigoCli'] ?? $r['codigo_tercero'] ?? '');
                if ($codigo === '') continue;

                $nombre = (string) ($r['Cliente'] ?? $r['nombre_tercero'] ?? '');
                $saldo  = (float) ($r['SaldoTotal'] ?? $r['saldo_total'] ?? 0);

                $existing = DB::table('saldo_cartera')
                    ->where('id_empresa', $empresa->id_empresa)
                    ->where('tipo', $tipo)
                    ->where('codigo_tercero', $codigo)
                    ->first();

                if ($existing) {
                    DB::table('saldo_cartera')
                        ->where('id', $existing->id)
                        ->update([
                            'nombre_tercero' => $nombre,
                            'saldo_total'    => $saldo,
                            'updated_at'     => \Carbon\Carbon::now(),
                        ]);
                    $actualizados++;
                } else {
                    DB::table('saldo_cartera')->insert([
                        'id_empresa'     => $empresa->id_empresa,
                        'tipo'           => $tipo,
                        'codigo_tercero' => $codigo,
                        'nombre_tercero' => $nombre,
                        'saldo_total'    => $saldo,
                        'created_at'     => \Carbon\Carbon::now(),
                        'updated_at'     => \Carbon\Carbon::now(),
                    ]);
                    $insertados++;
                }
            }
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'error' => true, 'mensaje' => 'Error procesando saldos', 'detalle' => $e->getMessage(),
            ], 500);
        }

        $this->logBatch($empresa->id_empresa, "saldos_$tipo", count($registros), $insertados, $actualizados, 0);

        return response()->json([
            'error'            => false,
            'insertados'       => $insertados,
            'actualizados'     => $actualizados,
            'total_procesados' => $insertados + $actualizados,
        ]);
    }

    // ========================================================================
    // CIERRES DE CAJA
    // ========================================================================

    public function cierresCajaBatch(Request $request): JsonResponse
    {
        $empresa = $this->authBatch($request);
        if (!$empresa) return $this->unauthorized();

        $registros = $request->input('registros', []);
        if (!is_array($registros) || count($registros) > 200) {
            return response()->json(['error' => true, 'mensaje' => 'registros inválido (máx 200)'], 422);
        }

        $insertados = 0;
        $actualizados = 0;
        $errores = [];

        DB::beginTransaction();
        try {
            foreach ($registros as $idx => $r) {
                $codvb6 = (string) ($r['Cod_ControlCaja'] ?? '');
                if ($codvb6 === '') {
                    $errores[] = ['idx' => $idx, 'mensaje' => 'Cod_ControlCaja obligatorio'];
                    continue;
                }

                $vContado = (float) ($r['VContado'] ?? 0);
                $vCredito = (float) ($r['VCredito'] ?? 0);
                $pagos    = (float) ($r['Pagos']    ?? 0);
                $egresos  = (float) ($r['Egresos']  ?? 0);
                $base     = (float) ($r['ValorInicialCaja'] ?? 0);

                $data = [
                    'id_empresa'          => $empresa->id_empresa,
                    'fecha'               => !empty($r['Fecha']) ? $this->parseDate($r['Fecha']) : null,
                    'fecha_cierre'        => !empty($r['FechaCierre']) ? \Carbon\Carbon::parse($r['FechaCierre']) : null,
                    'venta_contado'       => $vContado,
                    'venta_credito'       => $vCredito,
                    'pagos'               => $pagos,
                    'valor_total'         => (float) ($r['ValorTotal'] ?? 0),
                    'valor_inicial_caja'  => $base,
                    'egresos'             => $egresos,
                    'base'                => (float) ($r['Base'] ?? 0),
                    'billetes'            => (float) ($r['Villetes'] ?? 0),
                    'monedas'             => (float) ($r['Monedas']  ?? 0),
                    'cheques'             => (float) ($r['Cheques']  ?? 0),
                    'saldo_libros'        => (float) ($r['SaldoEnLibros'] ?? 0),
                    'diferencia'          => (float) ($r['Diferencia']    ?? 0),
                    'valor_inventario'    => (float) ($r['VInventario']   ?? 0),
                    'total_venta_dia'     => $vContado + $vCredito,
                    'total_efectivo'      => $base + $vContado + $pagos - $egresos,
                    'estado'              => (int) ($r['Estado'] ?? 1),
                    'id_usuario'          => isset($r['Id_Usuario']) ? (int) $r['Id_Usuario'] : null,
                    'updated_at'          => \Carbon\Carbon::now(),
                ];

                $existing = DB::table('cierres_caja')
                    ->where('id_empresa', $empresa->id_empresa)
                    ->where('codvb6', $codvb6)
                    ->first();

                if ($existing) {
                    DB::table('cierres_caja')
                        ->where('id_cierre', $existing->id_cierre)
                        ->update($data);
                    $actualizados++;
                } else {
                    $data['codvb6']     = $codvb6;
                    $data['created_at'] = \Carbon\Carbon::now();
                    DB::table('cierres_caja')->insert($data);
                    $insertados++;
                }
            }
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'error' => true, 'mensaje' => 'Error procesando cierres de caja', 'detalle' => $e->getMessage(),
            ], 500);
        }

        $this->logBatch($empresa->id_empresa, 'cierres_caja', count($registros), $insertados, $actualizados, count($errores));

        return response()->json([
            'error'            => false,
            'insertados'       => $insertados,
            'actualizados'     => $actualizados,
            'total_procesados' => $insertados + $actualizados,
            'total_errores'    => count($errores),
            'errores'          => $errores,
        ]);
    }

    // ========================================================================
    // Helpers
    // ========================================================================

    private function parseDate(string $str): ?string
    {
        try {
            // Aceptamos d/m/Y o Y-m-d
            if (preg_match('#^\d{2}/\d{2}/\d{4}$#', $str)) {
                return \Carbon\Carbon::createFromFormat('d/m/Y', $str)->toDateString();
            }
            return \Carbon\Carbon::parse($str)->toDateString();
        } catch (\Throwable $e) {
            return null;
        }
    }
}
