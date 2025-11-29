<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
    /**
     * Récupère TOUS les utilisateurs avec leur rôle calculé depuis metier_roles
     * Cette méthode doit synchroniser la logique avec AuthController::me()
     * pour garantir que le rôle affiché est le même que celui utilisé en session.
     */
    public function index()
    {
        // Récupérer tous les utilisateurs
        $users = User::all();

        // Pour chaque utilisateur, calculer son rôle depuis metier_roles
        $usersWithRoles = $users->map(function ($user) {
            return $this->enrichUserWithRole($user);
        });

        return response()->json($usersWithRoles);
    }

    /**
     * Récupère un utilisateur spécifique avec son rôle calculé
     */
    public function show($id)
    {
        $user = User::findOrFail($id);
        $userWithRole = $this->enrichUserWithRole($user);

        return response()->json($userWithRole);
    }

    /**
     * MÉTHODE CENTRALE : Enrichit un utilisateur avec son rôle calculé depuis metier_roles
     * Cette logique DOIT être identique à AuthController::me() pour garantir la cohérence.
     * 
     * Logique :
     * 1. Extraire num_metier depuis metier_info (JSON)
     * 2. Chercher dans metier_roles si ce métier a un rôle assigné
     * 3. Si oui, récupérer le rôle depuis la table roles
     * 4. Si non, fallback sur "consultant" par défaut
     */
    private function enrichUserWithRole(User $user): array
    {
        // Décoder le JSON metier_info
        $metierInfo = is_string($user->metier_info) 
            ? json_decode($user->metier_info, true) 
            : $user->metier_info;

        // Extraire num_metier
        $numMetier = $metierInfo['num_metier'] ?? null;

        // Variables par défaut (consultant)
        $role = null;
        $roleCode = 'consultant';
        $roleLabel = 'Consultant';
        $roleId = null;

        // Si num_metier existe, chercher dans metier_roles
        if ($numMetier) {
            // Jointure metier_roles + roles pour récupérer le rôle assigné
            $metierRole = DB::table('metier_roles')
                ->where('num_metier', $numMetier)
                ->first();

            if ($metierRole && $metierRole->role_id) {
                // Récupérer le rôle depuis la table roles
                $role = Role::find($metierRole->role_id);

                if ($role) {
                    $roleId = $role->id;
                    $roleCode = $role->code;
                    $roleLabel = $role->label;
                }
            }
        }

        // Si aucun rôle trouvé, fallback sur consultant
        if (!$role) {
            $role = Role::where('code', 'consultant')->first();
            if ($role) {
                $roleId = $role->id;
                $roleCode = $role->code;
                $roleLabel = $role->label;
            }
        }

        // Construire le full_name
        $fullName = trim(($user->prenom ?? '') . ' ' . ($user->nom ?? ''));

        // Retourner l'utilisateur avec les champs calculés
        return [
            'id' => $user->id,
            'login' => $user->login,
            'nom' => $user->nom,
            'prenom' => $user->prenom,
            'email' => $user->email,
            'site' => $user->site,
            'actif' => $user->actif,
            'full_name' => $fullName,
            
            // Données de métier (depuis metier_info JSON)
            'metier' => [
                'num_metier' => $metierInfo['num_metier'] ?? null,
                'nom_metier' => $metierInfo['nom_metier'] ?? null,
                'code_region' => $metierInfo['code_region'] ?? null,
            ],
            
            // Rôle calculé depuis metier_roles (source de vérité)
            'role_id' => $roleId,
            'role_code' => $roleCode,
            'role_label' => $roleLabel,
            
            // Timestamps
            'last_sync_at' => $user->last_sync_at,
            'created_at' => $user->created_at,
            'updated_at' => $user->updated_at,
        ];
    }

    /**
     * Crée ou met à jour un utilisateur
     * (utilisé lors de la synchronisation SSO)
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'login' => 'required|string|unique:users,login',
            'nom' => 'required|string',
            'prenom' => 'required|string',
            'email' => 'required|email',
            'site' => 'nullable|string',
            'metier_info' => 'required|array',
        ]);

        $user = User::create($validated);
        $userWithRole = $this->enrichUserWithRole($user);

        return response()->json($userWithRole, 201);
    }

    /**
     * Met à jour un utilisateur existant
     */
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'nom' => 'sometimes|string',
            'prenom' => 'sometimes|string',
            'email' => 'sometimes|email',
            'site' => 'nullable|string',
            'metier_info' => 'sometimes|array',
            'actif' => 'sometimes|boolean',
        ]);

        $user->update($validated);
        $userWithRole = $this->enrichUserWithRole($user);

        return response()->json($userWithRole);
    }

    /**
     * Supprime un utilisateur (soft delete si configuré)
     */
    public function destroy($id)
    {
        $user = User::findOrFail($id);
        $user->delete();

        return response()->json(['message' => 'Utilisateur supprimé'], 200);
    }
}