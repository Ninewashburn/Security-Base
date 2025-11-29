<?php
// app/Models/Incident.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use App\Traits\HasHistory;
use Carbon\Carbon;

class Incident extends Model
{
    use HasFactory, SoftDeletes, HasHistory;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'object',
        'domains',
        'gravity', 
        'status',
        'dateOuverture',
        'dateCloture',
        'isNational',
        'ticketNumber',
        'lienTicketHelpy',
        'lienTicketTandem',
        'meteo',
        'publicsImpactes',
        'sitesImpactes',
        'description',
        'actionsMenees',
        'actionsAMener',
        'tempsIndisponibilite',
        'archived',
        'archived_at',
        'archived_by',
        'archiveReason',
        'mailAlerte',
        'auto_notified_emails',
        'template_excluded_emails',
        'previousStatus',
        'created_by',
        'assigned_to',
        'validateur_id',
        'validation_status',
        'validated_at',
        'template_actions',
        'template_id',
    ];

    /**
     * Cast des champs JSON et dates
     */
    protected $casts = [
        // Tableaux
        'domains' => 'array',
        'publicsImpactes' => 'array', 
        'sitesImpactes' => 'array',
        'template_actions' => 'array',
        'actionsAMener' => 'array',
        'actionsMenees' => 'array',
        'mailAlerte' => 'array',
        'auto_notified_emails' => 'array',
        'template_excluded_emails' => 'array',
        
        // Dates
        'dateOuverture' => 'datetime',
        'dateCloture' => 'datetime', 
        'archived_at' => 'datetime',
        'validated_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        
        // Booleans
        'archived' => 'boolean',
        'meteo' => 'boolean',
        'isNational' => 'boolean',
    ];

    /**
     * Champs exclus de l'historique automatique
     * dateOuverture et dateCloture sont protégés par HasHistory
     */
    protected $historyExcludedFields = [
        'updated_at',
        'deleted_at',
    ];
    
    /**
     * ÉVÉNEMENTS AUTOMATIQUES
     */
    protected static function booted()
    {
        // /**
        //  * PROTECTION ULTIME CONTRE LA CORRUPTION DE dateOuverture
        //  * Ce mécanisme protège la date d'ouverture contre toute modification non désirée
        //  * lors des opérations de sauvegarde (update, softDelete, restore).
        //  */
        // static::saving(function ($incident) {
        //     // Avant chaque sauvegarde, on met de côté la valeur originale de dateOuverture
        //     // si elle n'a pas déjà été préservée par un autre processus (comme le trait HasHistory).
        //     if ($incident->exists && !isset($incident->preservedDateOuverture)) {
        //         $incident->preservedDateOuverture = $incident->getOriginal('dateOuverture');
        //     }
        // });

        // static::saved(function ($incident) {
        //     // Après la sauvegarde, on vérifie si la date a été corrompue.
        //     $wasCorrupted = false;
        //     $correctDate = null;

        //     if (isset($incident->preservedDateOuverture)) {
        //         // Utiliser la valeur préservée par l'événement 'saving'
        //         $correctDate = $incident->preservedDateOuverture;
        //         // Comparer les dates après les avoir normalisées
        //         if ($incident->dateOuverture->ne($correctDate)) {
        //             $wasCorrupted = true;
        //         }
        //     }

        //     if ($wasCorrupted) {
        //         Log::critical('CORRUPTION DETECTEE ET CORRIGEE', [
        //             'incident_id' => $incident->id,
        //             'valeur_corrompue' => $incident->dateOuverture,
        //             'valeur_correcte' => $correctDate,
        //         ]);

        //         // Forcer la réécriture de la bonne date en contournant les événements.
        //         $incident->updateQuietly([
        //             'dateOuverture' => $correctDate
        //         ]);
        //     }

        //     // Nettoyer la propriété temporaire
        //     unset($incident->preservedDateOuverture);
        // });

        // Auto-alimentation + alerte lors de la création
        static::created(function ($incident) {
            // $incident->autoAlimentFromObject();
            $incident->sendGravityAlert();
        });
        
        // Auto-alimentation + alerte lors de modification d'objet/gravité
        static::updated(function ($incident) {
            if ($incident->wasChanged('object')) {
                Log::info("Objet modifié pour incident #{$incident->id}: {$incident->getOriginal('object')} → {$incident->object}");
                $incident->autoAlimentFromObject();
            }
            
            if ($incident->wasChanged('gravity')) {
                Log::info("Gravité modifiée pour incident #{$incident->id}: {$incident->getOriginal('gravity')} → {$incident->gravity}");
                $incident->sendGravityAlert();
            }
        });

        static::deleted(function ($incident) {
            if ($incident->isForceDeleting()) {
                return;
            }
            
            $mailService = app(\App\Services\IncidentMailService::class);
            $mailService->sendForIncident($incident, 'soft_delete');
        });
    }

    /**
     * AUTO-ALIMENTATION SELON L'OBJET
     */
    public function autoAlimentFromObject(): void
    {
        if (!$this->object) return;

        try {
            $templateService = app(\App\Services\IncidentTemplateService::class);
            
            // Récupérer tous les templates actifs
            $templates = $templateService->getActiveTemplatesForDropdown();
            
            $bestMatch = null;
            $bestScore = 0;
            
            // Chercher le meilleur template correspondant
            foreach ($templates as $template) {
                $score = $this->calculateTemplateMatchScore($this->object, $template['nom_objet']);
                
                if ($score > $bestScore && $score >= 70) {
                    $bestScore = $score;
                    $bestMatch = $template;
                }
            }
            
            // Appliquer le template si un bon match est trouvé
            if ($bestMatch) {
                $fullTemplate = $templateService->getTemplateWithActions($bestMatch['id']);
                
                if ($fullTemplate && $fullTemplate['actions']) {
                    $this->applyTemplateToIncident($fullTemplate, $bestScore);
                    
                    Log::info("Auto-alimentation automatique appliquée", [
                        'incident_id' => $this->id,
                        'template' => $bestMatch['nom_objet'],
                        'score' => $bestScore
                    ]);
                }
            }
            
        } catch (\Exception $e) {
            Log::warning("Auto-alimentation échouée pour incident #{$this->id}: " . $e->getMessage());
        }
    }

    /**
     * CALCULER LE SCORE DE CORRESPONDANCE ENTRE OBJET ET TEMPLATE
     */
    private function calculateTemplateMatchScore(string $objetIncident, string $nomTemplate): float
    {
        $objet = strtolower(trim($objetIncident));
        $template = strtolower(trim($nomTemplate));
        
        if ($objet === $template) {
            return 100;
        }
        
        if (strpos($objet, $template) !== false) {
            return 95;
        }
        
        if (strpos($template, $objet) !== false) {
            return 90;
        }
        
        $objetWords = explode(' ', $objet);
        $templateWords = explode(' ', $template);
        
        $matches = 0;
        $totalWords = count($templateWords);
        
        foreach ($templateWords as $templateWord) {
            if (strlen($templateWord) <= 3) continue;
            
            foreach ($objetWords as $objetWord) {
                if (stripos($objetWord, $templateWord) !== false || 
                    stripos($templateWord, $objetWord) !== false) {
                    $matches++;
                    break;
                }
            }
        }
        
        return $totalWords > 0 ? ($matches / $totalWords) * 80 : 0;
    }

    /**
     * APPLIQUER UN TEMPLATE À L'INCIDENT
     */
    private function applyTemplateToIncident(array $template, float $score): void
    {
        $formattedActions = [];
        
        foreach ($template['actions'] as $index => $action) {
            $formattedActions[] = [
                'id' => $index + 1,
                'action' => $action['action'] ?? '',
                'responsable' => $action['responsable'] ?? '',
                'delai' => $action['delai'] ?? '',
                'priorite' => $action['obligatoire'] ? 'haute' : 'normale',
                'statut' => 'a_faire',
                'completed' => false,
                'completed_at' => null,
                'notes' => ''
            ];
        }
        
        $this->updateQuietly([
            'template_actions' => [
                'template_id' => $template['id'],
                'template_name' => $template['nom_objet'],
                'applied_at' => now()->toISOString(),
                'match_score' => $score,
                'actions' => $formattedActions
            ],
            'actionsAMener' => empty($this->actionsAMener) ? $formattedActions : $this->actionsAMener
        ]);
    }

    /**
     * ALERTES EMAIL SELON GRAVITÉ
     */
    public function sendGravityAlert(): void
    {
        if (!$this->gravity) return;

        Log::info("Envoi alerte email incident #{$this->id} - Gravité: {$this->gravity}");

        $emailLists = DiffusionList::where('gravite', $this->gravity)
                                          ->where('actif', true)
                                          ->get();

        if ($emailLists->isEmpty()) {
            Log::warning("Aucune liste de diffusion configurée pour la gravité: {$this->gravity}");
            return;
        }

        foreach ($emailLists as $list) {
            $this->processEmailList($list);
        }

        if (in_array($this->gravity, ['grave', 'tres_grave'])) {
            $this->triggerValidationWorkflow();
        }
    }

    private function processEmailList(DiffusionList $list): void
    {
        $emails = is_array($list->emails) ? $list->emails : (json_decode($list->emails, true) ?? []);        
        if ($list->service_id) {
            $serviceEmails = $this->getServiceSpecificEmails($list->service_id);
            $emails = array_merge($emails, $serviceEmails);
        }

        $emails = array_unique(array_filter($emails));

        if (empty($emails)) {
            Log::warning("Liste de diffusion #{$list->id} vide pour gravité {$this->gravity}");
            return;
        }

        try {
            Log::info("Alerte envoyée - Liste #{$list->id}", [
                'incident_id' => $this->id,
                'gravite' => $this->gravity,
                'emails_count' => count($emails),
            ]);
        } catch (\Exception $e) {
            Log::error("Erreur envoi alerte liste #{$list->id}: " . $e->getMessage());
        }
    }

    private function triggerValidationWorkflow(): void
    {
        $responsable = $this->getServiceResponsable();
        
        if (!$responsable) {
            Log::error("Aucun responsable trouvé pour valider incident #{$this->id}");
            return;
        }

        $this->update([
            'validation_status' => 'en_attente',
            'validateur_id' => $responsable->id
        ]);

        Log::info("Workflow de validation créé", [
            'incident_id' => $this->id,
            'responsable' => $responsable->full_name ?? $responsable->name
        ]);
    }

    private function getServiceSpecificEmails(int $serviceId): array
    {
        return User::where('service_id', $serviceId)
                  ->where('actif', true)
                  ->whereNotNull('email')
                  ->pluck('email')
                  ->toArray();
    }

    private function getServiceResponsable(): ?User
    {
        if (!$this->creator || !$this->creator->service) {
            return null;
        }

        return User::where('service', $this->creator->service)
                  ->where('role', 'responsable')
                  ->where('actif', true)
                  ->first();
    }

    /**
     * RELATIONS
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function validator()
    {
        return $this->belongsTo(User::class, 'validateur_id');
    }

    public function template()
    {
        return $this->belongsTo(\App\Models\IncidentTemplate::class, 'template_id');
    }

    /**
     * ACCESSORS POUR COMPATIBILITÉ ANGULAR
     */
    public function getRedacteurAttribute(): ?string
    {
        return $this->creator?->full_name ?? $this->creator?->name;
    }

    public function getIntervenantAttribute(): ?string
    {
        return $this->assignee?->full_name ?? $this->assignee?->name;
    }

    public function getNeedsValidationAttribute(): bool
    {
        return in_array($this->gravity, ['grave', 'tres_grave']) && 
               $this->validation_status !== 'valide';
    }

    public function getValidationStatusLabelAttribute(): string
    {
        return match($this->validation_status) {
            'en_attente' => 'En attente de validation',
            'valide' => 'Validé',
            'refuse' => 'Refusé',
            default => 'Non applicable'
        };
    }

    public function getNotifiedEmailsAttribute(): array
    {
        $emails = [];

        $autoNotified = $this->auto_notified_emails;
        if (is_string($autoNotified)) {
            $autoNotified = json_decode($autoNotified, true) ?? [];
        }
        
        foreach ($autoNotified ?? [] as $email) {
            $emails[] = ['email' => $email, 'source' => 'automatique'];
        }

        $mailAlerte = $this->mailAlerte;
        if (is_string($mailAlerte)) {
            $mailAlerte = json_decode($mailAlerte, true) ?? [];
        }

        foreach ($mailAlerte ?? [] as $email) {
            $emails[] = ['email' => $email, 'source' => 'manuel'];
        }

        return $emails;
    }

    public function getHasPendingActionsAttribute(): bool
    {
        return !empty($this->actionsAMener);
    }

    /**
     * MÉTHODES DE VALIDATION
     */
    public function validateIncident(User $validator, string $commentaire = null): bool
    {
        $this->update([
            'validation_status' => 'valide',
            'validateur_id' => $validator->id,
            'validated_at' => now()
        ]);

        Log::info("Incident #{$this->id} validé par {$validator->full_name}");
        return true;
    }

    public function rejectIncident(User $validator, string $commentaire): bool
    {
        $this->update([
            'validation_status' => 'refuse',
            'validateur_id' => $validator->id,
            'validated_at' => now()
        ]);

        Log::info("Incident #{$this->id} refusé par {$validator->full_name}");
        return true;
    }

    /**
     * ACCESSORS APPENDÉS AU JSON
     */
    protected $appends = [
        'redacteur', 
        'intervenant', 
        'needs_validation', 
        'validation_status_label',
        'has_pending_actions',
        'notified_emails'
    ];

    /**
     * SCOPES
     */
    public function scopePendingValidation($query)
    {
        return $query->whereIn('gravity', ['grave', 'tres_grave'])
                    ->where('validation_status', 'en_attente');
    }

    public function scopeByGravity($query, string $gravity)
    {
        return $query->where('gravity', $gravity);
    }
}