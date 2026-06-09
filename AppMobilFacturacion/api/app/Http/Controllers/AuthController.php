<?php

namespace App\Http\Controllers;

use App\Models\Empresa;
use App\Models\Vendedor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Tymon\JWTAuth\Exceptions\JWTException;
use Tymon\JWTAuth\Exceptions\TokenExpiredException;
use Tymon\JWTAuth\Exceptions\TokenInvalidException;
use Tymon\JWTAuth\Facades\JWTAuth;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email'    => 'required|email',
            'password' => 'required|string|min:4',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error'   => true,
                'mensaje' => 'Datos inválidos',
                'errores' => $validator->errors(),
            ], 422);
        }

        $vendedor = Vendedor::where('email', $request->email)
            ->where('activo', true)
            ->first();

        if (!$vendedor || !Hash::check($request->password, $vendedor->password)) {
            return response()->json([
                'error'   => true,
                'mensaje' => 'Credenciales inválidas',
            ], 401);
        }

        try {
            $token = JWTAuth::fromUser($vendedor);
        } catch (JWTException $e) {
            return response()->json([
                'error'   => true,
                'mensaje' => 'No se pudo generar el token',
            ], 500);
        }

        $vendedor->ultimo_login = \Carbon\Carbon::now();
        $vendedor->save();

        $empresa = Empresa::find($vendedor->id_empresa);

        return response()->json([
            'error'    => false,
            'mensaje'  => 'Login exitoso',
            'token'    => $token,
            'token_type' => 'bearer',
            'expira_en'  => config('jwt.ttl') * 60,
            'vendedor' => [
                'id'               => $vendedor->id,
                'codigo'           => $vendedor->codigo,
                'nombre'           => $vendedor->nombre,
                'email'            => $vendedor->email,
                'telefono'         => $vendedor->telefono,
                'zona'             => $vendedor->zona,
                'can_edit_clients' => (bool) $vendedor->can_edit_clients,
            ],
            'empresa' => $empresa ? [
                'id'                         => $empresa->id_empresa,
                'nombre'                     => $empresa->nombre_empresa,
                'nit'                        => $empresa->nit,
                'direccion'                  => $empresa->direccion,
                'telefono'                   => $empresa->telefono,
                'factura_electronica_activa' => (bool) $empresa->factura_electronica_activa,
                'modo_pedidos'               => (bool) $empresa->modo_pedidos,
                'modo_factura_pos'           => (bool) $empresa->modo_factura_pos,
                'modo_factura_electronica'   => (bool) $empresa->modo_factura_electronica,
            ] : null,
        ]);
    }

    public function me(): JsonResponse
    {
        $vendedor = Auth::user();
        $empresa = Empresa::find($vendedor->id_empresa);

        return response()->json([
            'error'    => false,
            'vendedor' => [
                'id'               => $vendedor->id,
                'codigo'           => $vendedor->codigo,
                'nombre'           => $vendedor->nombre,
                'email'            => $vendedor->email,
                'telefono'         => $vendedor->telefono,
                'zona'             => $vendedor->zona,
                'can_edit_clients' => (bool) $vendedor->can_edit_clients,
                'ultimo_login'     => $vendedor->ultimo_login,
            ],
            'empresa' => $empresa ? [
                'id'                         => $empresa->id_empresa,
                'nombre'                     => $empresa->nombre_empresa,
                'nit'                        => $empresa->nit,
                'factura_electronica_activa' => (bool) $empresa->factura_electronica_activa,
                'modo_pedidos'               => (bool) $empresa->modo_pedidos,
                'modo_factura_pos'           => (bool) $empresa->modo_factura_pos,
                'modo_factura_electronica'   => (bool) $empresa->modo_factura_electronica,
            ] : null,
        ]);
    }

    public function refresh(): JsonResponse
    {
        try {
            $newToken = JWTAuth::refresh(JWTAuth::getToken());
        } catch (TokenExpiredException $e) {
            return response()->json([
                'error'   => true,
                'mensaje' => 'Token expirado, haz login nuevamente',
            ], 401);
        } catch (TokenInvalidException $e) {
            return response()->json([
                'error'   => true,
                'mensaje' => 'Token inválido',
            ], 401);
        } catch (JWTException $e) {
            return response()->json([
                'error'   => true,
                'mensaje' => 'Token ausente',
            ], 401);
        }

        return response()->json([
            'error'      => false,
            'token'      => $newToken,
            'token_type' => 'bearer',
            'expira_en'  => config('jwt.ttl') * 60,
        ]);
    }

    public function logout(): JsonResponse
    {
        try {
            JWTAuth::invalidate(JWTAuth::getToken());
        } catch (JWTException $e) {
            // Ignore, logout idempotente
        }

        return response()->json([
            'error'   => false,
            'mensaje' => 'Sesión cerrada',
        ]);
    }
}
