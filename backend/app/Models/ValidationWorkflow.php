<?php
//app/Models/ValidationWorkflow.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ValidationWorkflow extends Model
{
    use HasFactory;

    protected $fillable = [
        'incident_id',
        'gravite',
        'validation_status',
        'validateur_requis_id',
        'validateur_effectif_id',
        'validated_at',
        'commentaire_validation',
        'deadline_validation'
    ];

    protected $casts = [
        'validated_at' => 'datetime',
        'deadline_validation' => 'datetime'
    ];

    /**
     * RELATIONS
     */
    public function incident()
    {
        return $this->belongsTo(Incident::class);
    }

    public function validateurRequis()
    {
        return $this->belongsTo(User::class, 'validateur_requis_id');
    }

    public function validateurEffectif()
    {
        return $this->belongsTo(User::class, 'validateur_effectif_id');
    }

    /**
     * SCOPES
     */
    public function scopePending($query)
    {
        return $query->where('validation_status', 'en_attente');
    }

    public function scopeOverdue($query)
    {
        return $query->where('validation_status', 'en_attente')
                    ->where('deadline_validation', '<', now());
    }

    /**
     * ACCESSORS
     */
    public function getIsOverdueAttribute(): bool
    {
        return $this->validation_status === 'en_attente' && 
               $this->deadline_validation && 
               $this->deadline_validation->isPast();
    }

    public function getStatusLabelAttribute(): string
    {
        return match($this->validation_status) {
            'en_attente' => 'En attente',
            'valide' => 'Validé',
            'refuse' => 'Refusé',
            default => 'Inconnu'
        };
    }
}