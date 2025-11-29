<?php
// app/Http/Controllers/Api/RoleController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class RoleController extends Controller
{
    // Permissions critiques qui ne peuvent jamais être désactivées pour certains rôles
    private $criticalPermissions = [
        'admin' => [
            'can_view_dashboard',  // Admin doit toujours accéder au dashboard
            'can_modify',          // Admin doit pouvoir modifier les rôles
            'can_view_all'         // Permission de base
        ],
        'responsable' => ['can_view_all'],
        'technicien' => ['can_view_all'],
        'animateur' => ['can_view_all'],
        'consultant' => ['can_view_all']
    ];

    /**
     * Liste de tous les rôles
     */
    public function index()
    {
        $roles = Role::all();
        return response()->json($roles);
    }

    /**
     * Détails d'un rôle
     */
    public function show($id)
    {
        $role = Role::find($id);
       
        if (!$role) {
            return response()->json(['error' => 'Rôle introuvable'], 404);
        }
       
        return response()->json($role);
    }

    /**
     * Mettre à jour les permissions d'un rôle
     */
    public function update(Request $request, $id)
    {
        $role = Role::find($id);
       
        if (!$role) {
            return response()->json(['error' => 'Rôle introuvable'], 404);
        }

        $validated = $request->validate([
            'label' => 'sometimes|string|max:255',
            'description' => 'sometimes|string|nullable',
            'permissions' => 'sometimes|array',
            'permissions.can_create' => 'sometimes|boolean',
            'permissions.can_modify' => 'sometimes|boolean',
            'permissions.can_view_archives' => 'sometimes|boolean',
            'permissions.can_view_trash' => 'sometimes|boolean',
            'permissions.can_view_dashboard' => 'sometimes|boolean',
            'permissions.can_soft_delete' => 'sometimes|boolean',
            'permissions.can_force_delete' => 'sometimes|boolean',
            'permissions.can_view_all' => 'sometimes|boolean',
            'permissions.can_validate' => 'sometimes|boolean',
            'permissions.can_manage_emails' => 'sometimes|boolean',
            'permissions.can_export' => 'sometimes|boolean',
            'permissions.can_archive' => 'sometimes|boolean',
            'permissions.can_unarchive' => 'sometimes|boolean',
            'permissions.can_restore_from_trash' => 'sometimes|boolean',
            'permissions.can_view_history' => 'sometimes|boolean',
        ]);

        // Vérifier que les permissions critiques restent actives
        if (isset($validated['permissions'])) {
            $this->validateCriticalPermissions($role, $validated['permissions']);
        }

        $role->update($validated);

        Log::info("✅ Rôle {$role->code} mis à jour", [
            'permissions' => $role->permissions,
            'updated_by' => $request->user()->login ?? 'unknown'
        ]);

        return response()->json([
            'message' => 'Rôle mis à jour avec succès',
            'role' => $role->fresh()
        ]);
    }

    /**
     * Valider que les permissions critiques restent actives
     */
    private function validateCriticalPermissions(Role $role, array $newPermissions)
    {
        // Récupérer les permissions critiques pour ce rôle
        $criticalForThisRole = $this->criticalPermissions[$role->code] ?? [];
        
        if (empty($criticalForThisRole)) {
            return; // Pas de permissions critiques pour ce rôle
        }

        // Merger avec les permissions existantes
        $updatedPermissions = array_merge($role->permissions, $newPermissions);

        // Vérifier que toutes les permissions critiques sont toujours actives
        $missingCritical = [];
        foreach ($criticalForThisRole as $criticalPerm) {
            if (!($updatedPermissions[$criticalPerm] ?? false)) {
                $missingCritical[] = $criticalPerm;
            }
        }

        if (!empty($missingCritical)) {
            throw ValidationException::withMessages([
                'permissions' => [
                    "Les permissions suivantes sont critiques pour le rôle '{$role->label}' et ne peuvent pas être désactivées : " . 
                    implode(', ', $missingCritical)
                ]
            ]);
        }
    }

    /**
     * Récupérer les permissions d'un rôle par code
     */
    public function getByCode($code)
    {
        $role = Role::findByCode($code);
       
        if (!$role) {
            return response()->json(['error' => 'Rôle introuvable'], 404);
        }
       
        return response()->json($role);
    }

    /**
     * Obtenir les permissions critiques pour un rôle (pour l'UI)
     */
    public function getCriticalPermissions($code)
    {
        $critical = $this->criticalPermissions[$code] ?? [];
        
        return response()->json([
            'role_code' => $code,
            'critical_permissions' => $critical,
            'message' => 'Ces permissions ne peuvent pas être désactivées'
        ]);
    }
}