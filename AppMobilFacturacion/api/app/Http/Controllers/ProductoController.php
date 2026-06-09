<?php

namespace App\Http\Controllers;

use App\Models\Producto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ProductoController extends Controller
{
    /**
     * GET /api/productos
     * Lista los productos activos de la empresa del vendedor.
     */
    public function index(Request $request): JsonResponse
    {
        $vendedor = Auth::user();
        $search = trim($request->query('q', ''));
        $categoria = $request->query('id_categoria');
        $perPage = min((int) $request->query('per_page', 100), 500);
        $page = max((int) $request->query('page', 1), 1);

        $query = Producto::query()
            ->where('id_empresa', $vendedor->id_empresa)
            ->where('estado', true);

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('nombre', 'like', "%{$search}%")
                  ->orWhere('codigo', 'like', "%{$search}%");
            });
        }

        if ($categoria) {
            $query->where('id_categoria', (int) $categoria);
        }

        $total = $query->count();
        $items = $query->orderBy('nombre')
            ->offset(($page - 1) * $perPage)
            ->limit($perPage)
            ->get();

        return response()->json([
            'error'     => false,
            'productos' => $items,
            'total'     => $total,
            'per_page'  => $perPage,
            'page'      => $page,
            'last_page' => (int) ceil($total / $perPage),
        ]);
    }

    /**
     * GET /api/productos/{id}
     */
    public function show(int $id): JsonResponse
    {
        $vendedor = Auth::user();
        $producto = Producto::where('id_producto', $id)
            ->where('id_empresa', $vendedor->id_empresa)
            ->first();

        if (!$producto) {
            return response()->json(['error' => true, 'mensaje' => 'Producto no encontrado'], 404);
        }

        return response()->json(['error' => false, 'producto' => $producto]);
    }

    /**
     * GET /api/categorias
     */
    public function categorias(): JsonResponse
    {
        $vendedor = Auth::user();
        $cats = \DB::table('categorias')
            ->where('id_empresa', $vendedor->id_empresa)
            ->where('estado', true)
            ->orderBy('nombre')
            ->get();

        return response()->json(['error' => false, 'categorias' => $cats]);
    }
}
