<?php
// app/Models/IncidentTemplate.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IncidentTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'nom_objet',
        'actions',
        'actif',
        'description',
        'diffusion_list_id',
        'created_by',
        'updated_by'
    ];

    protected $casts = [
        'actions' => 'array',
        'actif' => 'boolean',
        'diffusion_list_id' => 'integer'
    ];

    /**
     * RELATIONS
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function diffusionList()
    {
        return $this->belongsTo(DiffusionList::class, 'diffusion_list_id');
    }

    /**
     * SCOPES
     */
    public function scopeActive($query)
    {
        return $query->where('actif', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('nom_objet', 'asc');
    }

    /**
     * HELPERS
     */
    public function getActionsCountAttribute(): int
    {
        return count($this->actions ?? []);
    }

    /**
     * Formater les actions pour le frontend
     */
    public function getFormattedActionsAttribute(): array
    {
        return array_map(function ($action, $index) {
            return [
                'id' => $index + 1,
                'action' => $action['action'] ?? '',
                'responsable' => $action['responsable'] ?? '',
                'delai' => $action['delai'] ?? '',
                'obligatoire' => $action['obligatoire'] ?? true
            ];
        }, $this->actions ?? [], array_keys($this->actions ?? []));
    }
}