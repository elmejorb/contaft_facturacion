<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Catálogos de geografía colombiana (DIAN).
 * Compatible con api-electronica: mismos ids y códigos DANE.
 */
class GeoController extends Controller
{
    /**
     * GET /api/catalogos/departamentos
     * Lista completa (son ~33, siempre pocos).
     */
    public function departamentos(): JsonResponse
    {
        $departments = DB::table('departments')
            ->select('id', 'code', 'name')
            ->orderBy('name')
            ->get();

        return response()->json([
            'error'         => false,
            'departamentos' => $departments,
        ]);
    }

    /**
     * GET /api/catalogos/municipios
     *
     * Por defecto devuelve TODOS los municipios (~1100) con el nombre del
     * departamento para usar como select buscable en el móvil.
     * Responde también una versión del nombre formateada: "Municipio - Departamento".
     *
     * Query params:
     *   ?department_id=N → filtra por departamento
     *   ?q=texto         → busca por nombre de municipio o departamento
     */
    public function municipios(Request $request): JsonResponse
    {
        $query = DB::table('municipalities as m')
            ->leftJoin('departments as d', 'm.department_id', '=', 'd.id')
            ->select(
                'm.id',
                'm.code',
                'm.name',
                'm.department_id',
                'd.name as departamento_nombre',
                'd.code as departamento_code',
            );

        if ($deptId = $request->query('department_id')) {
            $query->where('m.department_id', (int) $deptId);
        }

        if ($q = trim((string) $request->query('q', ''))) {
            $query->where(function ($w) use ($q) {
                $w->where('m.name', 'like', "%{$q}%")
                  ->orWhere('d.name', 'like', "%{$q}%");
            });
        }

        $items = $query->orderBy('m.name')->get();

        // Añade label unificado "Municipio - Departamento"
        $items = $items->map(function ($row) {
            $row->label = trim($row->name . ' - ' . ($row->departamento_nombre ?? ''));
            return $row;
        });

        return response()->json([
            'error'     => false,
            'municipios' => $items,
            'total'     => $items->count(),
        ]);
    }

    /**
     * GET /api/catalogos/municipios/{id}
     */
    public function municipioShow(int $id): JsonResponse
    {
        $m = DB::table('municipalities as m')
            ->leftJoin('departments as d', 'm.department_id', '=', 'd.id')
            ->select(
                'm.id',
                'm.code',
                'm.name',
                'm.department_id',
                'd.name as departamento_nombre',
                'd.code as departamento_code',
            )
            ->where('m.id', $id)
            ->first();

        if (!$m) {
            return response()->json(['error' => true, 'mensaje' => 'Municipio no encontrado'], 404);
        }

        $m->label = trim($m->name . ' - ' . ($m->departamento_nombre ?? ''));
        return response()->json(['error' => false, 'municipio' => $m]);
    }
}
