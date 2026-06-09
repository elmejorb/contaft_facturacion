<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * GET /api/dashboard/resumen
     * KPIs del día y actividad reciente del vendedor.
     */
    public function resumen(): JsonResponse
    {
        $vendedor = Auth::user();
        $hoy = \Carbon\Carbon::now()->toDateString();
        $inicioMes = \Carbon\Carbon::now()->startOfMonth()->toDateString();

        $ventasHoy = DB::table('ventas')
            ->where('id_vendedor_mobile', $vendedor->id)
            ->where('fecha_venta', $hoy)
            ->selectRaw('COUNT(*) as cantidad, COALESCE(SUM(total), 0) as total')
            ->first();

        $ventasMes = DB::table('ventas')
            ->where('id_vendedor_mobile', $vendedor->id)
            ->where('fecha_venta', '>=', $inicioMes)
            ->selectRaw('COUNT(*) as cantidad, COALESCE(SUM(total), 0) as total')
            ->first();

        $clientesAsignados = DB::table('mobile_vendedor_clientes')
            ->where('id_vendedor_mobile', $vendedor->id)
            ->count();

        $ventasRecientes = DB::table('ventas')
            ->leftJoin('clientes', 'ventas.id_cliente', '=', 'clientes.id_cliente')
            ->where('ventas.id_vendedor_mobile', $vendedor->id)
            ->orderByDesc('ventas.created_at')
            ->limit(5)
            ->select(
                'ventas.id_venta',
                'ventas.numero_factura',
                'ventas.total',
                'ventas.estado',
                'ventas.fecha_venta',
                'ventas.created_at',
                'clientes.nombre_razon_social'
            )
            ->get();

        return response()->json([
            'error' => false,
            'hoy' => [
                'ventas'     => (int) $ventasHoy->cantidad,
                'total'      => (float) $ventasHoy->total,
            ],
            'mes' => [
                'ventas' => (int) $ventasMes->cantidad,
                'total'  => (float) $ventasMes->total,
            ],
            'clientes_asignados' => $clientesAsignados,
            'ventas_recientes'   => $ventasRecientes,
        ]);
    }
}
