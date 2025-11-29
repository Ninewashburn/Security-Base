<?php
// app/Models/Role.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Role extends Model
{
    protected $fillable = [
        'code',
        'label',
        'description',
        'permissions',
        'is_active'
    ];

    protected $casts = [
        'permissions' => 'array', // Cast automatique JSON ↔ array
        'is_active' => 'boolean'
    ];

    // Ajouter les méthodes calculées en accesseurs pour l'API
    protected $appends = ['active_permissions_count', 'total_permissions_count', 'permission_percentage'];

    /**
     * Permissions par défaut pour utilisateurs SANS rôle
     * 
     * Important : Ceci n'est PAS le rôle "Consultant" !
     * C'est pour les utilisateurs qui n'ont AUCUN rôle assigné.
     * 
     * Consultant est maintenant un vrai rôle dans la table roles.
     */
    public static function getDefaultPermissions(): array
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
     * Récupérer un rôle par son code
     */
    public static function findByCode(string $code): ?self
    {
        return static::where('code', $code)->first();
    }

    /**
     * The users that belong to the role.
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(Utilisateur::class, 'role_user', 'role_id', 'user_id');
    }

    /**
     * Scope pour récupérer uniquement les rôles actifs
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Vérifier si une permission existe
     */
    public function hasPermission(string $permission): bool
    {
        return $this->permissions[$permission] ?? false;
    }

    /**
     * Compter le nombre de permissions actives (accessor)
     */
    public function getActivePermissionsCountAttribute(): int
    {
        return collect($this->permissions)->filter(fn($value) => $value === true)->count();
    }

    /**
     * Compter le nombre total de permissions (accessor)
     */
    public function getTotalPermissionsCountAttribute(): int
    {
        return count($this->permissions ?? []);
    }

    /**
     * Calculer le pourcentage de permissions actives (accessor)
     */
    public function getPermissionPercentageAttribute(): int
    {
        if ($this->total_permissions_count === 0) {
            return 0;
        }
        return (int) round(($this->active_permissions_count / $this->total_permissions_count) * 100);
    }
}