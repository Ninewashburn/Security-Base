<?php
// routes/api.php
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\{
    AuthController,
    IncidentController,
    DiffusionListController,
    IncidentTemplateController,
    RoleController,
    MetierController,
    IncidentHistoryController,
};

/*
|--------------------------------------------------------------------------
| Routes Publiques (pas d'authentification)
|--------------------------------------------------------------------------
*/
Route::post('/login', [AuthController::class, 'login']);
Route::get('/auth/sso-login', [AuthController::class, 'redirectToSSO'])->name('auth.sso.login');

/*
|--------------------------------------------------------------------------
| Routes SSO (utilisent les sessions PHP)
|--------------------------------------------------------------------------
*/
Route::middleware([
    \Illuminate\Session\Middleware\StartSession::class,
    \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
])->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me'])->name('auth.me');
    Route::match(['get', 'post'], '/auth/sso-callback', [AuthController::class, 'handleSsoLogin'])
        ->name('auth.sso.callback');
});

/*
|--------------------------------------------------------------------------
| Route Refresh Token (sans vérification stricte)
|--------------------------------------------------------------------------
*/
Route::post('/auth/verify-token', [AuthController::class, 'verifyAndRefreshToken']);

/*
|--------------------------------------------------------------------------
| Routes Semi-Publiques (lecture seule, pas de JWT requis)
|--------------------------------------------------------------------------
*/
Route::middleware('api')->group(function () {
    // Rôles accessibles SANS JWT (appelés au démarrage)
    Route::get('/roles', [RoleController::class, 'index']);
    Route::get('/roles/{id}', [RoleController::class, 'show']);
    Route::get('/roles/code/{code}', [RoleController::class, 'getByCode']);
});

/*
|--------------------------------------------------------------------------
| Routes API Protégées (vérification JWT via middleware)
|--------------------------------------------------------------------------
*/
Route::middleware(['api', 'verify.jwt.api'])->group(function () {
    
    // Auth & Utilisateurs
    Route::get('/metiers', [AuthController::class, 'getMetiers']);
    Route::get('/user/{login}', [AuthController::class, 'getUserDetails']);
    Route::get('/users', [AuthController::class, 'getAllUsers']);
    
    // Métiers et associations de rôles
    Route::get('/metiers-with-roles', [MetierController::class, 'index']);
    Route::post('/metiers/associate-role', [MetierController::class, 'associateRole']);
    Route::delete('/metiers/{numMetier}/role', [MetierController::class, 'removeAssociation']);
    
    // Modification de rôles (nécessite JWT)
    Route::patch('/roles/{id}', [RoleController::class, 'update']);
    
    // Incidents
    Route::get('incidents/trashed', [IncidentController::class, 'trashed']);
    Route::delete('incidents/trashed/{id}', [IncidentController::class, 'destroyTrashed']);
    Route::patch('incidents/{incident}/soft-delete', [IncidentController::class, 'softDelete']);
    Route::post('incidents/{incident}/restore', [IncidentController::class, 'restore'])->withTrashed();
    Route::patch('incidents/{incident}/archive', [IncidentController::class, 'archive']);
    Route::patch('incidents/{incident}/unarchive', [IncidentController::class, 'unarchive']);
    Route::patch('incidents/{incident}/validate', [IncidentController::class, 'validate']);
    Route::apiResource('incidents', IncidentController::class);
    
    // Historique des incidents
    Route::get('incidents/{incident}/histories', [IncidentHistoryController::class, 'index']);
    Route::get('incidents/{incident}/histories/{history}', [IncidentHistoryController::class, 'show']);
    
    // Listes de diffusion
    Route::apiResource('diffusion-lists', DiffusionListController::class);
    Route::get('diffusion-list/validator', [DiffusionListController::class, 'getValidatorList']);
    Route::put('diffusion-list/validator', [DiffusionListController::class, 'updateValidatorList']);
    
    // Templates
    Route::apiResource('incident-templates', IncidentTemplateController::class);
});