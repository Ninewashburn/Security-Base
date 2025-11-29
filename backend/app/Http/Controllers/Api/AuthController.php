<?php
// app/Http/Controllers/Api/AuthController.php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Log;
use App\Models\User;

class AuthController extends Controller
{
    /**
     * Obtenir l'URL de base de l'API du middleware depuis le .env
     */
    private function getMiddlewareApiUrl(): string
    {
        $baseUrl = env('AUTH_URL');
        return $baseUrl . '/api';
    }
    
    /**
     * Redirige vers le SSO URSSAF avec TOUS les paramètres requis
     * Appelée par Angular quand l'utilisateur clique sur "Connexion"
     */
    public function redirectToSSO()
    {
        // Construire l'URL du SSO directement depuis .env
        $loginUrl = env('AUTH_URL', 'https://bubblecom.urssaf.recouv') . '/login';
        
        // Callback Laravel
        $callbackUrl = url('/api/auth/sso-callback');
        
        // Paramètres requis
        $params = [
            'msg' => 'Authentification',
            'csrf' => csrf_token(),
            'redirect_url' => base64_encode($callbackUrl),
            'logo' => base64_encode('https://upload.wikimedia.org/wikipedia/commons/6/64/Lock_Icon.svg'),
            //Ancien logo : https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/SVG_Logo.svg/100px-SVG_Logo.svg.png
            //CSS error middleware : 'custom_css' => base64_encode('http://127.0.0.1/ogapi2/src/assets/css/auth.css'),
            'title' => 'Security-Base',
            'app_id' => env('AUTH_APP_ID', 'APP123'),
        ];
        
        $queryString = http_build_query($params);
        $fullUrl = $loginUrl . '?' . $queryString;
        
        // Log::info('🔄 Redirection vers SSO', [
        //     'login_url' => $loginUrl,
        //     'callback_url' => $callbackUrl,
        //     'params' => $params,
        //     'full_url' => $fullUrl
        // ]);
        
        // Redirection externe
        return redirect()->away($fullUrl);
    }
    
    /**
     * Vérifier la session Laravel + Récupérer le rôle depuis la BDD
     * Appelée par Angular depuis /auth/validating pour vérifier si l'utilisateur est connecté
     */
    public function me(Request $request)
    {
        // Vérifier si une session existe
        $user = Session::get('user');
        // Log::info('Session User Metier:', ['metier_data' => $user['metier'] ?? 'Not found in session']);
        $authenticated = Session::get('authenticated', false);
        $token = Session::get('user_token');

        if (!$user || !$token) {
            Log::warning('❌ Session invalide ou token manquant');
            return response()->json([
                'authenticated' => false,
                'message' => 'Non authentifié'
            ], 401);
        }
     
        // Log::info('🔍 Vérification session /api/auth/me', [
        //     'session_id' => Session::getId(),
        //     'has_user' => !empty($user),
        //     'authenticated' => $authenticated,
        //     'has_token' => !empty($token),
        //     'user_login' => $user['login'] ?? 'N/A'
        // ]);

        if (!$authenticated || !$user) {
            Log::warning('❌ Session non authentifiée');
            return response()->json(['authenticated' => false], 401);
        }

        // Récupérer le rôle depuis la base de données
        try {
            $numMetier = $user['metier']['num_metier'] ?? null;

            // Initialiser avec un rôle null et des permissions restrictives
            $role = null;
            $permissions = $this->getDefaultPermissions();

            if ($numMetier) {
                    $metierRole = \DB::table('metier_roles')
                    ->where('num_metier', $numMetier)
                    ->first();

                if ($metierRole && $metierRole->role_id) {
                    $role = \App\Models\Role::find($metierRole->role_id);
                    if ($role) {
                        $permissions = $role->permissions;
                        // Log::info('✅ Rôle trouvé pour le métier', ['role' => $role->code, 'num_metier' => $numMetier]);
                    } else {
                        Log::warning('⚠️ Rôle non trouvé en base malgré une association', ['role_id' => $metierRole->role_id]);
                    }
                } else {
                    Log::warning('⚠️ Pas de rôle assigné pour ce métier, aucun droit spécifique accordé.', ['num_metier' => $numMetier]);
                }
            } else {
                Log::warning('⚠️ Utilisateur sans métier, aucun rôle assigné.', ['user' => $user['login']]);
            }

            // Construire la réponse avec le nouveau format
            $userWithRole = array_merge($user, [
                'id' => (int) preg_replace('/\D/', '', $user['login']),
                'name' => $user['login'],
                'full_name' => ($user['pren_util'] ?? '') . ' ' . ($user['nom_util'] ?? ''),
                'email' => $user['mail'] ?? '',
                'prenom' => $user['pren_util'] ?? '',
                'nom' => $user['nom_util'] ?? '',
                'phone' => $user['tel'] ?? null,
                'department' => $user['code_region'] ?? null,
                'service' => $user['code_region'] ?? null,
                'siteImpacte' => $user['num_site'] ?? null,
                
                // Explicitly add metier for Angular
                'metier' => $user['metier'] ?? null,
                
                // Role comme objet (peut être null)
                'role' => $role ? [
                    'id' => $role->id,
                    'code' => $role->code,
                    'label' => $role->label,
                    'description' => $role->description ?? ''
                ] : null,
                
                // Explicitly add role_label and role_code for Angular
                'role_label' => $role ? $role->label : 'Aucun rôle',
                'role_code' => $role ? $role->code : 'aucun',

                // Permissions depuis la BDD ou restrictives par défaut
                'permissions' => $permissions
            ]);

            // Log::info('✅ Réponse /api/auth/me construite', [
            //     'user_login' => $userWithRole['login'],
            //     'role' => $userWithRole['role']['code'] ?? 'aucun',
            //     'permissions_count' => count(array_filter($permissions))
            // ]);

            return response()->json([
                'authenticated' => true,
                'user' => $userWithRole,
                'token' => $token
            ]);

        } catch (\Exception $e) {
            Log::error('❌ Erreur récupération rôle: ' . $e->getMessage(), [
                'exception' => get_class($e),
                'trace' => $e->getTraceAsString()
            ]);

            // Fallback en cas d'erreur : aucun rôle, permissions minimales
            return response()->json([
                'authenticated' => true,
                'user' => array_merge($user, [
                    'role' => null,
                    'permissions' => $this->getDefaultPermissions() // Permissions restrictives
                ]),
                'token' => $token
            ]);
        }
    }

      /**
     * Vérifie et rafraîchit le token via le middleware URSSAF
     * Proxy vers l'endpoint /api/verify-token du middleware
     * qui retourne automatiquement un new_token si nécessaire
     */
    public function verifyAndRefreshToken(Request $request)
    {
        $request->validate([
            'token' => 'required|string'
        ]);

        $token = $request->input('token');
        
        $middlewareUrl = config('services.urssaf_middleware.url');
        $apiKey = config('services.urssaf_middleware.api_key');
        
        try {
            $response = Http::withOptions(['verify' => false])
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'X-API-KEY' => $apiKey,
                ])
                ->timeout(5)
                ->post("{$middlewareUrl}/api/verify-token", [
                    'token' => $token
                ]);

            if ($response->failed()) {
                \Log::warning('⚠️ Middleware URSSAF a retourné une erreur', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);

                return response()->json([
                    'status' => 'error',
                    'message' => 'Token invalide ou expiré'
                ], 401);
            }

            $data = $response->json();

            // Le middleware retourne automatiquement un new_token si besoin
            if (isset($data['new_token']) && !empty($data['new_token'])) {
                // \Log::info('✅ Nouveau token reçu du middleware URSSAF');
                
                return response()->json([
                    'status' => 'success',
                    'message' => 'Token renouvelé avec succès',
                    'new_token' => $data['new_token'],
                    'data' => $data['data'] ?? null
                ]);
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Token valide',
                'data' => $data['data'] ?? null
            ]);

        } catch (\Exception $e) {
            \Log::error('❌ Erreur verify-token:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Erreur serveur lors de la vérification: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Permissions par défaut (Aucune - le plus restrictif)
     */
    private function getDefaultPermissions(): array
    {
        return [
            'can_create' => false,
            'can_modify' => false,
            'can_view_archives' => false,
            'can_view_trash' => false,
            'can_view_dashboard' => false,
            'can_soft_delete' => false,
            'can_force_delete' => false,
            'can_view_all' => false,
            'can_validate' => false,
            'can_manage_emails' => false,
            'can_export' => false,
            'can_archive' => false,
            'can_unarchive' => false,
            'can_restore_from_trash' => false,
        ];
    }
    
    /**
     * Callback SSO - Reçoit le token JWT du middleware URSSAF
     */
    public function handleSsoLogin(Request $request)
    {
        // Démarrer la session manuellement (car pas de middleware de groupe)
        if (!$request->hasSession()) {
            $request->setLaravelSession(app('session.store'));
        }
        
        // Récupérer le token depuis le POST body
        $token = $request->input('token');
        
        if (!$token) {
            Log::error('❌ Callback SSO sans token');
            return redirect(config('app.frontend_url') . '?error=no_token');
        }
        
        try {
            // Log::info('🔓 Décodage du JWT', ['token_preview' => substr($token, 0, 30) . '...']);
            
            $userData = $this->decodeJwt($token);
            
            if (empty($userData) || empty($userData['user'])) {
                Log::error('❌ JWT invalide ou mal formé', ['userData' => $userData]);
                return redirect(config('app.frontend_url') . '?error=invalid_token');
            }
            
            // Log::info('✅ JWT décodé avec succès', [
            //     'user_preview' => $userData['user']['user']['login'] ?? $userData['user']['login'] ?? 'unknown'
            // ]);
            
            // Token valide : stocker en session
            Session::put('user_token', $token);
            
            // Stocker les infos utilisateur
            $userInfo = $userData['user']['user'] ?? $userData['user'] ?? [];
            Session::put('user', $userInfo);
            
            // Marquer comme authentifié
            Session::put('authenticated', true);
            
            // Sauvegarder la session explicitement
            Session::save();

            // --- NOUVELLE LOGIQUE POUR PERSISTER L'UTILISATEUR EN BDD ---
            $userInDb = User::where('login', $userInfo['login'])->first();

            // Déterminer le rôle basé sur metier_info
            $determinedRoleCode = 'consultant'; // Rôle par défaut si aucun métier ou association trouvée
            $numMetier = $userInfo['metier']['num_metier'] ?? null;

            if ($numMetier) {
                $metierRole = \DB::table('metier_roles')
                    ->where('num_metier', $numMetier)
                    ->first();

                if ($metierRole && $metierRole->role_id) {
                    $roleObject = \App\Models\Role::find($metierRole->role_id);
                    if ($roleObject) {
                        $determinedRoleCode = $roleObject->code;
                    }
                }
            }

            $userDataToSave = [
                'login' => $userInfo['login'],
                'email' => $userInfo['mail'] ?? null,
                'nom' => $userInfo['nom_util'] ?? null,
                'prenom' => $userInfo['pren_util'] ?? null,
                'remote_user_id' => $userInfo['num_util'] ?? null,
                'site' => $userInfo['num_site'] ?? null,
                'metier_info' => $userInfo['metier'] ?? null,
                'last_sync_at' => now(),
                'actif' => true,
                'role' => $determinedRoleCode, // Attribuer le rôle déterminé
            ];

            if ($userInDb) {
                $userInDb->update($userDataToSave);
                Log::info('✅ Utilisateur BDD mis à jour via SSO', ['login' => $userInfo['login']]);
            } else {
                User::create($userDataToSave);
                Log::info('✅ Nouvel utilisateur BDD créé via SSO', ['login' => $userInfo['login']]);
            }            
            
            // Rediriger vers Angular - Page de validation
            return redirect(config('app.frontend_url') . '/auth/validating');

        } catch (\Exception $e) {
            Log::error('❌ Erreur callback SSO: ' . $e->getMessage(), [
                'exception' => get_class($e),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            return redirect(config('app.frontend_url') . '?error=sso_error');
        }
    }

    /**
     * Décoder un JWT sans vérification de signature
     */
    private function decodeJwt(string $token): array
    {
        try {
            $parts = explode('.', $token);
            if (count($parts) !== 3) {
                throw new \Exception('JWT invalide - format incorrect');
            }
            
            // Décoder le payload (partie 2 du JWT)
            $payload = base64_decode(strtr($parts[1], '-_', '+/'));
            $data = json_decode($payload, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new \Exception('JWT invalide - JSON mal formé: ' . json_last_error_msg());
            }
            
            // Log::info('JWT décodé', [
            //     'has_user' => isset($data['user']),
            //     'has_exp' => isset($data['exp']),
            //     'exp_date' => isset($data['exp']) ? date('Y-m-d H:i:s', $data['exp']) : null
            // ]);
            
            return $data ?? [];
            
        } catch (\Exception $e) {
            Log::error('Erreur décodage JWT: ' . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Login direct (pour dev/API)
     */
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'login' => 'required|string',
            'password' => 'required|string'
        ]);

        return $this->performLoginLogic($credentials);
    }

    /**
     * Logique de login principale
     */
    private function performLoginLogic(array $credentials)
    {
        try {
            $response = Http::withoutVerifying()->withHeaders([
                'Content-Type' => 'application/json',
                'X-API-KEY' => env('AUTH_API_KEY')
            ])->post($this->getMiddlewareApiUrl() . '/login', [
                'login' => $credentials['login'],
                'password' => $credentials['password']
            ]);

            if ($response->successful()) {
                $data = $response->json();
                
                return response()->json([
                    'token' => $data['token'],
                    'user' => $data['user'] ?? null
                ]);
            }

            return response()->json(['error' => 'Identifiants invalides'], 401);

        } catch (\Exception $e) {
            Log::error('Erreur login: ' . $e->getMessage());
            
            return response()->json([
                'error' => 'Service d\'authentification indisponible'
            ], 503);
        }
    }

    /**
     * Liste des métiers
     */
    public function getMetiers(Request $request)
    {
        try {
            $token = $request->bearerToken();
            
            if (!$token) {
                // Essayer de récupérer depuis la session Laravel
                $token = Session::get('user_token');
                
                if (!$token) {
                    Log::warning('❌ getMetiers: Token manquant');
                    return response()->json(['error' => 'Token manquant'], 401);
                }
            }

            // Url métier api
            $metiersUrl = env('METIERS_API_URL') . '/api/metiers';
            
            Log::info('🌐 Appel API métiers', ['url' => $metiersUrl]);

            $response = Http::withoutVerifying()
                ->timeout(10)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $token,
                    'X-API-KEY' => env('AUTH_API_KEY'),
                    'Accept' => 'application/json'
                ])->get($metiersUrl);

            if ($response->successful()) {
                $data = $response->json();
                
                Log::info('✅ Métiers récupérés', [
                    'count' => is_array($data) ? count($data) : 0
                ]);
                
                return response()->json($data);
            }

            Log::error('❌ Erreur API métiers', [
                'status' => $response->status(),
                'body' => substr($response->body(), 0, 200)
            ]);

            return response()->json([
                'error' => 'Erreur API métiers'
            ], $response->status());

        } catch (\Exception $e) {
            Log::error('❌ Exception getMetiers: ' . $e->getMessage());
            
            return response()->json([
                'error' => 'Erreur récupération métiers',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function getAllUsers()
    {
        $allUsers = \App\Models\User::all();
        $processedUsers = [];

        foreach ($allUsers as $user) {
            $userArray = $user->toArray();
            // Ensure role_code is present, using the accessor
            $userArray['role_code'] = $user->role_code;
            $processedUsers[] = $userArray;
        }

        return response()->json(['data' => $processedUsers]);
    }
}