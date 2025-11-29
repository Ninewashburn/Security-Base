<?php
// app/Http/Controllers/Api/MetierController.php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Role;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MetierController extends Controller
{
    /**
     * Récupère tous les métiers avec leurs rôles associés
     */
    public function index(Request $request)
    {
        try {
            // Récupérer les métiers depuis l'API URSSAF
            $token = $request->bearerToken();
            $metiersApiUrl = env('METIERS_API_URL') . '/api/metiers';
            
            $response = Http::withToken($token)
                ->withoutVerifying()
                ->get($metiersApiUrl);
                
            if (!$response->successful()) {
                return response()->json([
                    'error' => 'Impossible de récupérer les métiers depuis l\'API URSSAF',
                    'url' => $metiersApiUrl,
                    'status' => $response->status()
                ], 500);
            }
        
            $metiers = $response->json();
            
            // Récupérer toutes les associations métier-rôle
            $associations = DB::table('metier_roles')
                ->join('roles', 'metier_roles.role_id', '=', 'roles.id')
                ->select('metier_roles.num_metier', 'roles.id', 'roles.code', 'roles.label')
                ->get()
                ->keyBy('num_metier');
            Log::info('MetierController: Retrieved associations', ['associations' => $associations->toArray()]);
            
            // Enrichir les métiers avec leurs rôles
            $metiersWithRoles = collect($metiers)->map(function ($metier) use ($associations) {
                $association = $associations->get($metier['num_metier']);
                
                // Si une association existe, on l'ajoute, sinon on met null
                $metier['role'] = $association ? [
                    'id' => $association->id,
                    'code' => $association->code,
                    'label' => $association->label
                ] : null;
                
                return $metier;
            });
            
            // Récupérer tous les rôles disponibles
            $roles = Role::select('id', 'code', 'label')->get();
            
            return response()->json([
                'data' => [
                    'metiers' => $metiersWithRoles,
                    'roles' => $roles
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error('Erreur MetierController::index', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Erreur serveur lors de la récupération des métiers'
            ], 500);
        }
    }
    
    /**
     * Associe un rôle à plusieurs métiers
     */
    public function associateRole(Request $request)
    {
        $request->validate([
            'role_id' => 'nullable|integer|exists:roles,id',
            'metier_nums' => 'required|array',
            'metier_nums.*' => 'integer',
        ]);

        $roleId = $request->input('role_id');
        $metierNums = $request->input('metier_nums');

        $roleCode = null;
        if ($roleId) {
            $role = Role::find($roleId);
            if ($role) {
                $roleCode = $role->code;
            }
        }

        foreach ($metierNums as $numMetier) {
            // Update/insert metier_roles association
            DB::table('metier_roles')->updateOrInsert(
                ['num_metier' => $numMetier],
                ['role_id' => $roleId] // $roleId peut maintenant être null
            );
            Log::info('MetierController: Role association updated/inserted', [
                'num_metier' => $numMetier,
                'role_id' => $roleId
            ]);

            // Update users.role for all users associated with this metier
            DB::table('users')->whereJsonContains('metier_info->num_metier', $numMetier)
                ->update(['role' => $roleCode]);
            Log::info('MetierController: Users role updated', [
                'num_metier' => $numMetier,
                'new_role_code' => $roleCode
            ]);
        }

        return response()->json(['message' => 'Rôle associé aux métiers avec succès.']);
    }
    
    /**
     * Supprime l'association d'un métier
     */
    public function removeAssociation($numMetier)
    {
        try {
            $deleted = DB::table('metier_roles')
                ->where('num_metier', $numMetier)
                ->delete();
            
            if ($deleted) {
                return response()->json([
                    'success' => true,
                    'message' => 'Association supprimée avec succès'
                ]);
            }
            
            return response()->json([
                'error' => 'Aucune association trouvée pour ce métier'
            ], 404);
            
        } catch (\Exception $e) {
            Log::error('Erreur MetierController::removeAssociation', [
                'message' => $e->getMessage(),
                'num_metier' => $numMetier
            ]);
            
            return response()->json([
                'error' => 'Erreur lors de la suppression de l\'association'
            ], 500);
        }
    }
}