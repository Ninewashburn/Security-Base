<?php
// app/Http/Middleware/VerifyJwtTokenApi.php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class VerifyJwtTokenApi
{
    /**
     * Vérifie la validité du token JWT via le middleware URSSAF
     */
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if (!$token) {
            Log::warning('API: Token manquant', ['url' => $request->fullUrl()]);
            return response()->json(['message' => 'Token manquant'], 401);
        }

        $middlewareUrl = config('services.urssaf_middleware.url');
        $apiKey = config('services.urssaf_middleware.api_key');

        try {
            // Appel au middleware URSSAF pour vérifier le token
            $response = Http::withOptions(['verify' => false])
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'X-API-KEY' => $apiKey,
                ])
                ->timeout(10)
                ->post("{$middlewareUrl}/api/verify-token", [
                    'token' => $token
                ]);

            $data = $response->json();

            // Token invalide ou erreur
            if ($response->failed() || ($data['status'] ?? '') === 'error') {
                Log::warning('API: Token invalide', [
                    'status' => $response->status(),
                    'message' => $data['message'] ?? 'Token rejeté'
                ]);

                return response()->json([
                    'message' => $data['message'] ?? 'Token invalide ou expiré'
                ], 401);
            }

            // Token valide - Stocker les infos utilisateur dans la requête
            $request->attributes->set('user', $data['data']['user'] ?? null);
            
            // Si un nouveau token est fourni (refresh automatique)
            if (!empty($data['new_token'])) {
                $request->attributes->set('new_token', $data['new_token']);
                // Log::info('API: Token renouvelé automatiquement', [
                //     'user' => $data['data']['user']['login'] ?? 'unknown'
                // ]);
            }

            return $next($request);

        } catch (\Exception $e) {
            Log::error('API: Exception lors de la vérification du token', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'message' => 'Erreur serveur lors de la vérification du token'
            ], 500);
        }
    }
}