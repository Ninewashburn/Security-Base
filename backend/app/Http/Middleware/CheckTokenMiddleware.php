<?php
// src/app/Http/Middleware/CheckTokenMiddleware.php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Log;

class CheckTokenMiddleware
{
    /**
     * Routes exclues de la vérification de token
     */
    private array $excludedRoutes = [
        'api/auth/me',
        'api/auth/sso-callback',
        'api/auth/sso-login',
        'api/login',
    ];

    public function handle(Request $request, Closure $next)
    {
        // Exclure les routes publiques
        if ($this->shouldExclude($request)) {
            Log::info('✓ Route exclue du CheckTokenMiddleware', [
                'path' => $request->path()
            ]);
            return $next($request);
        }

        // Récupération du token depuis la session
        $token = Session::get('user_token') ?? $request->input('token');
        
        // Si le token est vide, redirection vers la page de login
        if (!$token) {
            Log::warning('❌ Pas de token - Redirection login');
            return $this->redirectToLogin();
        }
        
        // Vérification de la validité du token
        $response = $this->checkTokenValidity($token);
        
        if (!$response || ($response['status'] ?? '') === 'error') {
            Log::warning('❌ Token invalide - Destruction session');
            Session::flush();
            return $this->redirectToLogin($response['message'] ?? 'Authentification');
        }
        
        // Mise à jour du token si un nouveau est retourné
        if (!empty($response['new_token'])) {
            Session::put('user_token', $response['new_token']);
            Session::put('user', $response['data']['user'] ?? []);
            Session::put('token', bin2hex(random_bytes(32)));
            
            Log::info('✓ Token renouvelé');
        }
        
        // Continuer la requête
        return $next($request);
    }

    /**
     * Vérifier si la route doit être exclue
     */
    private function shouldExclude(Request $request): bool
    {
        $path = $request->path();
        
        foreach ($this->excludedRoutes as $excludedRoute) {
            if ($path === $excludedRoute || str_starts_with($path, $excludedRoute)) {
                return true;
            }
        }
        
        return false;
    }

    private function checkTokenValidity($token)
    {
        try {
            $url = config('auth.token_verification_url');
            
            $response = Http::withOptions([
                'verify' => false,
            ])->withHeaders([
                'Authorization' => 'Bearer ' . $token,
                'X-API-KEY' => env('AUTH_API_KEY'),
                'Content-Type' => 'application/json'
            ])->post($url, [
                'token' => $token,
            ]);
            
            return $response->json();
            
        } catch (\Exception $e) {
            Log::error('Erreur vérification token: ' . $e->getMessage());
            return null;
        }
    }

    private function redirectToLogin($message = 'Authentification')
    {
        $loginUrl = env('AUTH_URL', 'https://bubblecom.urssaf.recouv') . '/login';
        $callbackUrl = url('/api/auth/sso-callback');
        
        $params = [
            'msg' => $message,
            'csrf' => csrf_token(),
            'redirect_url' => base64_encode($callbackUrl),
            'logo' => base64_encode('https://upload.wikimedia.org/wikipedia/commons/6/64/Lock_Icon.svg'),
            //Ancien logo : https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/SVG_Logo.svg/100px-SVG_Logo.svg.png
            'custom_css' => base64_encode('http://127.0.0.1/ogapi2/src/assets/css/auth.css'),
            'title' => 'Security-Base',
            'app_id' => env('AUTH_APP_ID', 'APP123'),
        ];
        
        $queryString = http_build_query($params);
        
        Log::info('🔄 Redirection vers SSO depuis middleware', [
            'login_url' => $loginUrl,
            'callback_url' => $callbackUrl
        ]);
        
        return redirect()->away($loginUrl . '?' . $queryString);
    }
}