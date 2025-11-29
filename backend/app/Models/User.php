<?php

// app/Models/User.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Models\Role;
use Illuminate\Support\Facades\DB;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'login',
        'email',
        'nom',
        'prenom',
        'role',
        'site',
        'remote_user_id',
        'metier_info',
        'actif',
        'last_sync_at',
    ];

    protected $hidden = [
        'remember_token',
    ];

    protected $casts = [
        'metier_info' => 'array',
        'actif' => 'boolean',
        'last_sync_at' => 'datetime',
    ];

    protected $appends = ['full_name', 'metier', 'role_label', 'role_code'];

    /**
     * =============================================
     * PERMISSIONS DYNAMIQUES (SYSTÈME MODERNE)
     * =============================================
     * Utilise le JSON permissions de la table roles
     * au lieu de permissions hardcodées
     */

    /**
     * Vérifier une permission spécifique
     * @param string $permissionKey - Clé de permission (ex: 'can_create', 'can_modify')
     * @return bool
     */
    public function hasPermission(string $permissionKey): bool
    {
        $role = $this->calculated_role;
        
        if (!isset($role->permissions) || !is_array($role->permissions)) {
            return false;
        }
        
        return $role->permissions[$permissionKey] ?? false;
    }

    /**
     * Création d'incident
     */
    public function canCreateIncident(): bool
    {
        return $this->hasPermission('can_create');
    }

    /**
     * Modification d'incident
     * @param Incident|null $incident - Incident à modifier (pour vérifier ownership)
     */
    public function canModifyIncident(?Incident $incident = null): bool
    {
        if (!$this->hasPermission('can_modify')) {
            return false;
        }
        
        // Si technicien, vérifier qu'il est le créateur
        if ($this->role_code === 'technicien' && $incident) {
            return $incident->created_by === $this->id;
        }
        
        return true;
    }

    /**
     * Validation d'incident
     */
    public function canValidateIncident(): bool
    {
        return $this->hasPermission('can_validate');
    }

    /**
     * Consultation de tous les incidents
     */
    public function canViewAllIncidents(): bool
    {
        return $this->hasPermission('can_view_all');
    }

    /**
     * Consultation des archives
     */
    public function canViewArchives(): bool
    {
        return $this->hasPermission('can_view_archives');
    }

    /**
     * Archivage d'incident
     */
    public function canArchiveIncident(): bool
    {
        return $this->hasPermission('can_archive');
    }

    /**
     * Désarchivage d'incident
     */
    public function canUnarchiveIncident(): bool
    {
        return $this->hasPermission('can_unarchive');
    }

    /**
     * Consultation de la corbeille
     */
    public function canViewTrash(): bool
    {
        return $this->hasPermission('can_view_trash');
    }

    /**
     * Restauration depuis la corbeille
     */
    public function canRestoreFromTrash(): bool
    {
        return $this->hasPermission('can_restore_from_trash');
    }

    /**
     * Suppression (corbeille) - soft delete
     */
    public function canSoftDeleteIncident(): bool
    {
        return $this->hasPermission('can_soft_delete');
    }

    /**
     * Suppression définitive - force delete
     */
    public function canForceDeleteIncident(): bool
    {
        return $this->hasPermission('can_force_delete');
    }

    /**
     * Accès au tableau de bord admin
     */
    public function canViewDashboard(): bool
    {
        return $this->hasPermission('can_view_dashboard');
    }

    /**
     * Gestion des notifications/listes de diffusion
     */
    public function canManageEmails(): bool
    {
        return $this->hasPermission('can_manage_emails');
    }

    /**
     * Export de données
     */
    public function canExportData(): bool
    {
        return $this->hasPermission('can_export');
    }

    /**
     * Consultation du journal d'audit
     */
    public function canViewAuditLog(): bool
    {
        return $this->hasPermission('can_view_audit_log');
    }

    /**
     * =============================================
     * MÉTHODES OBSOLÈTES (COMPATIBILITÉ)
     * =============================================
     * Gardées pour rétrocompatibilité mais pointent vers les nouvelles méthodes
     */

    /** @deprecated Utiliser canArchiveIncident() */
    public function canManageArchiveSettings(): bool
    {
        return $this->canArchiveIncident();
    }

    /** @deprecated Utiliser canViewArchives() */
    public function canViewArchivedIncidents(): bool
    {
        return $this->canViewArchives();
    }

    /**
     * =============================================
     * ATTRIBUTS CALCULÉS
     * =============================================
     */

    /**
     * Nom complet de l'utilisateur
     */
    public function getFullNameAttribute(): string
    {
        return "{$this->prenom} {$this->nom}";
    }

    /**
     * Calculer le rôle dynamiquement depuis metier_roles
     * Cette méthode est la SOURCE DE VÉRITÉ pour les rôles utilisateurs
     */
    public function getCalculatedRoleAttribute(): object
    {
        $metierInfo = $this->metier_info;
        
        // Si pas de métier, retourner consultant par défaut
        if (!is_array($metierInfo) || !isset($metierInfo['num_metier'])) {
            return $this->getDefaultRole();
        }
        
        // Chercher le rôle associé au métier dans metier_roles
        $metierRole = DB::table('metier_roles')
            ->join('roles', 'metier_roles.role_id', '=', 'roles.id')
            ->where('metier_roles.num_metier', $metierInfo['num_metier'])
            ->select('roles.id', 'roles.code', 'roles.label', 'roles.permissions')
            ->first();
        
        // Si trouvé, retourner le rôle de metier_roles
        if ($metierRole) {
            return (object)[
                'id' => $metierRole->id,
                'code' => $metierRole->code,
                'label' => $metierRole->label,
                'permissions' => json_decode($metierRole->permissions, true),
            ];
        }
        
        // Sinon, retourner consultant par défaut
        return $this->getDefaultRole();
    }

    /**
     * Retourne le rôle consultant par défaut
     */
    private function getDefaultRole(): object
    {
        return (object)[
            'code' => 'consultant',
            'label' => 'Consultant',
            'permissions' => Role::getDefaultPermissions(),
        ];
    }

    /**
     * Code du rôle (ex: 'admin', 'responsable', 'technicien', 'animateur', 'consultant')
     */
    public function getRoleCodeAttribute(): string
    {
        return $this->calculated_role->code;
    }

    /**
     * Label du rôle (ex: 'Administrateur', 'Responsable', etc.)
     */
    public function getRoleLabelAttribute(): string
    {
        return $this->calculated_role->label;
    }

    /**
     * Accesseur pour le métier (car metier_info est un array)
     */
    public function getMetierAttribute()
    {
        $metierInfo = $this->metier_info;
        
        if (is_array($metierInfo) && isset($metierInfo['nom_metier'])) {
            return (object) $metierInfo; // Cast en objet pour un accès cohérent
        }
        
        return null;
    }

    /**
     * =============================================
     * RELATIONS
     * =============================================
     */

    /**
     * Incidents créés par cet utilisateur
     */
    public function incidentsCreated()
    {
        return $this->hasMany(Incident::class, 'created_by');
    }

    /**
     * Incidents assignés à cet utilisateur
     */
    public function incidentsAssigned()
    {
        return $this->hasMany(Incident::class, 'assigned_to');
    }

    /**
     * Relation vers le rôle (via code)
     */
    public function roleObject()
    {
        return $this->belongsTo(Role::class, 'role', 'code');
    }

    /**
     * =============================================
     * HELPERS POUR LE DÉVELOPPEMENT
     * =============================================
     */

    /**
     * Obtenir toutes les permissions de l'utilisateur
     * Utile pour le debug et l'affichage
     */
    public function getAllPermissions(): array
    {
        return $this->calculated_role->permissions ?? [];
    }

    /**
     * Vérifier si l'utilisateur a un rôle spécifique
     * @param string $roleCode - Code du rôle (ex: 'admin', 'responsable')
     */
    public function hasRole(string $roleCode): bool
    {
        return $this->role_code === $roleCode;
    }

    /**
     * Vérifier si l'utilisateur a l'un des rôles spécifiés
     * @param array $roleCodes - Tableau de codes de rôles
     */
    public function hasAnyRole(array $roleCodes): bool
    {
        return in_array($this->role_code, $roleCodes);
    }
}