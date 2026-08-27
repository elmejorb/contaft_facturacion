<?php

namespace App\Http\Middleware;

use App\Models\Empresa;
use Closure;
use Illuminate\Http\Request;

/**
 * Autenticación por JWT firmado del CRM de Innovación Digital.
 *
 * Contrato: cada request debe traer el JWT del CRM en el header
 *     Authorization: Bearer <jwt>
 *
 * El middleware:
 *   1. Verifica la firma RS256 con la llave pública del CRM.
 *   2. Verifica que el JWT no haya expirado (claim `exp`).
 *   3. Verifica que el módulo requerido esté activo en `modulos.<nombre>`.
 *   4. Resuelve la empresa por `cliente_id` (upsert si no existe aún).
 *   5. Adjunta la empresa al request para que el controller la use.
 *
 * Uso en rutas:
 *     $router->group(['middleware' => 'entitlement:vendedor_movil'], function () {...});
 *
 * Ver: CRM InnovacionDG/INTEGRACION_ENTITLEMENTS.md
 */
class EntitlementsAuth
{
    // Llave pública RS256 del CRM. Copiada del documento oficial.
    const CRM_PUBLIC_KEY = <<<KEY
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1corQr4nwAWsCj3++R8I
joGiOYkAr4Tvf5GwVY11LzIHFk30f+PEfjlXTaXoB3bynXqDxBZ2pAnzquYuUTnH
QzoRyq/S42q5AUAL62NHvVKlsqFvNNZXaP7bKymM6SfLcgVeZIc4xc7ylhCWOtR4
lKTfva41ZqV776KtVYD6ZrOJfZFdc6E4wpDOSg/0p0igKE696a1zBrX2LT9AIWkB
aK9EtO+IVaaTicJsnJOkWQjO7AwkuzxUgl5MJS740w53ATQeTmdoEYAk/+5DFE8A
Oll6J0ohQDVPJQP2Sg+pb0EPjIbO5zyVQZ2MIIkwbJ/h0Xkl0pKjuHMPCYEfYXcu
6QIDAQAB
-----END PUBLIC KEY-----
KEY;

    public function handle(Request $request, Closure $next, string $modulo = null)
    {
        $jwt = $this->extractBearerToken($request);
        if (!$jwt) {
            return response()->json([
                'error'   => true,
                'code'    => 'JWT_MISSING',
                'mensaje' => 'Falta header Authorization: Bearer <jwt>',
            ], 401);
        }

        try {
            $payload = $this->verifyJwt($jwt);
        } catch (\Throwable $e) {
            return response()->json([
                'error'   => true,
                'code'    => 'JWT_INVALIDO',
                'mensaje' => 'JWT inválido: ' . $e->getMessage(),
            ], 401);
        }

        // Validación de módulo requerido (si se pasó como parámetro de ruta)
        if ($modulo) {
            $mod = $payload->modulos->{$modulo} ?? null;
            if (!$mod || !($mod->activo ?? false)) {
                return response()->json([
                    'error'   => true,
                    'code'    => 'MODULO_NO_ACTIVO',
                    'mensaje' => "El módulo '$modulo' no está activo en su suscripción",
                    'modulo'  => $modulo,
                ], 403);
            }
            // Vigencia (opcional — el CRM ya considera esto en `activo`,
            // pero doble check por si el token es viejo)
            if (!empty($mod->vigencia_hasta)) {
                $vencido = strtotime($mod->vigencia_hasta) < time();
                if ($vencido) {
                    return response()->json([
                        'error'   => true,
                        'code'    => 'MODULO_VENCIDO',
                        'mensaje' => "El módulo '$modulo' venció el " . $mod->vigencia_hasta,
                        'modulo'  => $modulo,
                    ], 402);
                }
            }
        }

        // Resolver / crear empresa por cliente_id del CRM
        $clienteId = (int) ($payload->cliente_id ?? 0);
        if ($clienteId <= 0) {
            return response()->json([
                'error'   => true,
                'code'    => 'CLIENTE_ID_MISSING',
                'mensaje' => 'JWT sin cliente_id',
            ], 401);
        }

        $empresa = Empresa::where('cliente_id_crm', $clienteId)->first();
        if (!$empresa) {
            // Auto-provisioning: crea la empresa la primera vez que se ve
            // este cliente_id. Los datos vienen del propio JWT (nombre, nit).
            $empresa = new Empresa();
            $empresa->cliente_id_crm       = $clienteId;
            $empresa->nombre_empresa       = (string) ($payload->empresa ?? 'Sin nombre');
            $empresa->nit                  = (string) ($payload->nit ?? '');
            $empresa->email                = 'crm-' . $clienteId . '@innovacion-digital.com';
            $empresa->token_api            = bin2hex(random_bytes(24));
            $empresa->save();
        } else {
            // Update de datos por si cambiaron en el CRM (nombre, nit)
            $empresa->nombre_empresa = (string) ($payload->empresa ?? $empresa->nombre_empresa);
            $empresa->nit            = (string) ($payload->nit ?? $empresa->nit);
            $empresa->save();
        }

        // Adjunta al request para que los controllers la usen
        $request->attributes->set('empresa_entitlement', $empresa);
        $request->attributes->set('jwt_payload', $payload);

        return $next($request);
    }

    private function extractBearerToken(Request $request): ?string
    {
        $header = $request->header('Authorization', '');
        if (stripos($header, 'Bearer ') === 0) {
            return trim(substr($header, 7));
        }
        return null;
    }

    /**
     * Verifica firma RS256 usando OpenSSL nativo — sin librería externa.
     * Lanza Exception si algo falla; retorna el payload decodificado si OK.
     */
    private function verifyJwt(string $jwt)
    {
        $parts = explode('.', $jwt);
        if (count($parts) !== 3) throw new \Exception('formato');
        [$headerB64, $payloadB64, $sigB64] = $parts;

        $b64urlDecode = function ($s) {
            $pad = strlen($s) % 4;
            if ($pad) $s .= str_repeat('=', 4 - $pad);
            return base64_decode(strtr($s, '-_', '+/'));
        };

        $signature = $b64urlDecode($sigB64);
        $signingInput = $headerB64 . '.' . $payloadB64;

        $pubKey = openssl_pkey_get_public(self::CRM_PUBLIC_KEY);
        if (!$pubKey) throw new \Exception('llave pública inválida');

        $ok = openssl_verify($signingInput, $signature, $pubKey, OPENSSL_ALGO_SHA256);
        if ($ok !== 1) throw new \Exception('firma inválida');

        $payload = json_decode($b64urlDecode($payloadB64));
        if (!$payload) throw new \Exception('payload corrupto');

        if (!empty($payload->exp) && $payload->exp < time()) {
            throw new \Exception('token expirado');
        }

        return $payload;
    }
}
