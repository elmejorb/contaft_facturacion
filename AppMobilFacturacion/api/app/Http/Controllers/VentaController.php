<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use App\Models\Producto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class VentaController extends Controller
{
    /**
     * GET /api/ventas
     * Lista las ventas creadas por el vendedor autenticado.
     */
    public function index(Request $request): JsonResponse
    {
        $vendedor = Auth::user();
        $perPage = min((int) $request->query('per_page', 20), 100);
        $page = max((int) $request->query('page', 1), 1);
        $estado = $request->query('estado');
        $origen = $request->query('origen');
        $fechaInicio = $request->query('fecha_inicio');
        $fechaFin = $request->query('fecha_fin');

        $query = DB::table('ventas')
            ->leftJoin('clientes', 'ventas.id_cliente', '=', 'clientes.id_cliente')
            ->where('ventas.id_vendedor_mobile', $vendedor->id)
            ->select(
                'ventas.*',
                'clientes.nombre_razon_social',
                'clientes.numero_documento'
            );

        if ($estado) {
            $query->where('ventas.estado', $estado);
        }
        if ($origen) {
            $query->where('ventas.origen', $origen);
        }
        if ($excluirOrigen = $request->query('excluir_origen')) {
            $query->where('ventas.origen', '!=', $excluirOrigen);
        }
        if ($fechaInicio) {
            $query->where('ventas.fecha_venta', '>=', $fechaInicio);
        }
        if ($fechaFin) {
            $query->where('ventas.fecha_venta', '<=', $fechaFin);
        }

        $total = $query->count();
        $items = $query->orderByDesc('ventas.created_at')
            ->offset(($page - 1) * $perPage)
            ->limit($perPage)
            ->get();

        return response()->json([
            'error'     => false,
            'ventas'    => $items,
            'total'     => $total,
            'per_page'  => $perPage,
            'page'      => $page,
            'last_page' => (int) ceil($total / $perPage),
        ]);
    }

    /**
     * GET /api/ventas/{id}
     */
    public function show(int $id): JsonResponse
    {
        $vendedor = Auth::user();

        $venta = DB::table('ventas')
            ->leftJoin('clientes', 'ventas.id_cliente', '=', 'clientes.id_cliente')
            ->where('ventas.id_venta', $id)
            ->where('ventas.id_vendedor_mobile', $vendedor->id)
            ->select(
                'ventas.*',
                'clientes.nombre_razon_social',
                'clientes.numero_documento',
                'clientes.tipo_documento',
                'clientes.direccion as cliente_direccion',
                'clientes.telefono as cliente_telefono'
            )
            ->first();

        if (!$venta) {
            return response()->json(['error' => true, 'mensaje' => 'Venta no encontrada'], 404);
        }

        $detalles = DB::table('venta_detalles')
            ->where('id_venta', $id)
            ->get();

        return response()->json([
            'error'    => false,
            'venta'    => $venta,
            'detalles' => $detalles,
        ]);
    }

    /**
     * POST /api/ventas
     * Crea una venta con sus líneas. Ejecuta en transacción.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'id_cliente'        => 'required|integer',
            'fecha_venta'       => 'nullable|date',
            'forma_pago'        => 'nullable|string|in:contado,credito,tarjeta,transferencia',
            'observaciones'     => 'nullable|string',
            'origen'            => 'nullable|string|max:20',
            'items'             => 'required|array|min:1',
            'items.*.id_producto'   => 'required|integer',
            'items.*.cantidad'      => 'required|numeric|min:0.01',
            'items.*.precio_unitario' => 'required|numeric|min:0',
            'items.*.descuento'     => 'nullable|numeric|min:0',
            'items.*.porcentaje_iva' => 'nullable|numeric|min:0|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error'   => true,
                'mensaje' => 'Datos inválidos',
                'errores' => $validator->errors(),
            ], 422);
        }

        $vendedor = Auth::user();

        $cliente = Cliente::where('id_cliente', $request->id_cliente)
            ->where('id_empresa', $vendedor->id_empresa)
            ->first();

        if (!$cliente) {
            return response()->json(['error' => true, 'mensaje' => 'Cliente inválido'], 422);
        }

        try {
            DB::beginTransaction();

            $subtotal = 0;
            $totalImpuestos = 0;
            $totalDescuento = 0;
            $lineas = [];

            foreach ($request->items as $item) {
                $producto = Producto::where('id_producto', $item['id_producto'])
                    ->where('id_empresa', $vendedor->id_empresa)
                    ->first();

                if (!$producto) {
                    throw new \Exception("Producto {$item['id_producto']} no encontrado");
                }

                $cant = (float) $item['cantidad'];
                $precio = (float) $item['precio_unitario'];
                $desc = (float) ($item['descuento'] ?? 0);
                $pctIva = (float) ($item['porcentaje_iva'] ?? $producto->porcentaje_iva);

                $sub = $cant * $precio - $desc;
                $imp = $sub * ($pctIva / 100);
                $total = $sub + $imp;

                $subtotal += $sub;
                $totalImpuestos += $imp;
                $totalDescuento += $desc;

                $lineas[] = [
                    'id_producto'     => $producto->id_producto,
                    'nombre_producto' => $producto->nombre,
                    'cantidad'        => $cant,
                    'precio_unitario' => $precio,
                    'subtotal'        => $sub,
                    'descuento'       => $desc,
                    'porcentaje_iva'  => $pctIva,
                    'impuesto'        => $imp,
                    'total'           => $total,
                    'created_at'      => \Carbon\Carbon::now(),
                    'updated_at'      => \Carbon\Carbon::now(),
                ];
            }

            $totalVenta = $subtotal + $totalImpuestos;

            // Número de factura correlativo por empresa
            $ultNumero = DB::table('ventas')
                ->where('id_empresa', $vendedor->id_empresa)
                ->max('id_venta');
            $numeroFactura = 'M' . str_pad((string) (($ultNumero ?? 0) + 1), 6, '0', STR_PAD_LEFT);

            $idVenta = DB::table('ventas')->insertGetId([
                'id_empresa'        => $vendedor->id_empresa,
                'id_cliente'        => $cliente->id_cliente,
                'id_vendedor_mobile' => $vendedor->id,
                'numero_factura'    => $numeroFactura,
                'fecha_venta'       => $request->fecha_venta ?? \Carbon\Carbon::now()->toDateString(),
                'subtotal'          => $subtotal,
                'total_impuestos'   => $totalImpuestos,
                'descuento'         => $totalDescuento,
                'total'             => $totalVenta,
                'forma_pago'        => $request->forma_pago ?? 'contado',
                'observaciones'     => $request->observaciones,
                'origen'            => $request->origen ?? 'mobile',
                'estado'            => 'registrada',
                'created_at'        => \Carbon\Carbon::now(),
                'updated_at'        => \Carbon\Carbon::now(),
            ]);

            foreach ($lineas as &$linea) {
                $linea['id_venta'] = $idVenta;
            }
            DB::table('venta_detalles')->insert($lineas);

            DB::table('mobile_sync_log')->insert([
                'id_vendedor_mobile' => $vendedor->id,
                'tipo'               => 'venta',
                'accion'             => 'crear',
                'id_referencia'      => $idVenta,
                'estado'             => 'ok',
                'detalle'            => "Venta {$numeroFactura} · Total {$totalVenta}",
                'fecha'              => \Carbon\Carbon::now(),
            ]);

            DB::commit();

            $venta = DB::table('ventas')->where('id_venta', $idVenta)->first();

            return response()->json([
                'error'   => false,
                'mensaje' => 'Venta registrada',
                'venta'   => $venta,
            ], 201);

        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'error'   => true,
                'mensaje' => 'Error al registrar venta',
                'detalle' => $e->getMessage(),
            ], 500);
        }
    }
}
