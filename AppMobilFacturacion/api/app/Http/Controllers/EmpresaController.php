<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Endpoints públicos de la entidad Empresa que aprovechan el JWT del CRM
 * (via middleware `entitlement`).
 */
class EmpresaController extends Controller
{
    /**
     * POST /api/empresas/activar
     *
     * Handshake de activación del módulo Vendedores Móviles desde el desktop:
     *   - El middleware `entitlement:vendedor_movil` valida el JWT del CRM
     *     y auto-provisiona la fila en `empresas` (si es primera vez).
     *   - Este endpoint solo devuelve los datos que el desktop necesita
     *     guardar en tbl_config_vendedores para trabajar con el hub.
     */
    public function activar(Request $request): JsonResponse
    {
        $empresa = $request->attributes->get('empresa_entitlement');
        $payload = $request->attributes->get('jwt_payload');

        if (!$empresa) {
            return response()->json([
                'error'   => true,
                'mensaje' => 'Empresa no resuelta desde el JWT',
            ], 500);
        }

        return response()->json([
            'error'          => false,
            'mensaje'        => 'Empresa activada / actualizada',
            'id_empresa'     => (int) $empresa->id_empresa,
            'token_api'      => $empresa->token_api,
            'cliente_id_crm' => (int) ($payload->cliente_id ?? 0),
            'empresa'        => $empresa->nombre_empresa,
            'nit'            => $empresa->nit,
            'modulo' => [
                'activo'         => $payload->modulos->vendedor_movil->activo ?? false,
                'cantidad'       => $payload->modulos->vendedor_movil->cantidad ?? null,
                'vigencia_hasta' => $payload->modulos->vendedor_movil->vigencia_hasta ?? null,
            ],
        ]);
    }
}
