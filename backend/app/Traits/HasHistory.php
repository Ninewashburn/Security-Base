<?php
// app/Traits/HasHistory.php

namespace App\Traits;

use App\Models\IncidentHistory;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Carbon;

trait HasHistory
{
    /**
     * ID utilisateur pour l'historique
     */
    private ?int $_historyUserId = null;

    /**
     * Variable pour tracker si on est en train de delete/restore
     */
    protected $skipHistory = false;

    /**
     * Date de suppression avant restore
     */
    protected $deletedAtBeforeRestore = null;

    /**
     * Date d'ouverture à préserver
     */
    protected $preservedDateOuverture = null;

    /**
     * Champs à exclure de l'historique
     */
    protected function getHistoryExcludedFields(): array
    {
        return $this->historyExcludedFields ?? [
            'updated_at',
            'deleted_at',
        ];
    }

    /**
     * Boot du trait - s'exécute automatiquement quand le modèle est initialisé
     */
    protected static function bootHasHistory(): void
    {
        // AVANT toute mise à jour : sauvegarder dateOuverture
        static::updating(function ($model) {
            // Sauvegarder dateOuverture AVANT toute modification
            $model->preservedDateOuverture = $model->getOriginal('dateOuverture');
            
            Log::debug("Update détecté - DateOuverture sauvegardée", [
                'model' => get_class($model),
                'id' => $model->id,
                'dateOuverture' => $model->preservedDateOuverture,
            ]);
        });

        // AVANT delete : sauvegarder dateOuverture
        static::deleting(function ($model) {
            $model->preservedDateOuverture = $model->getOriginal('dateOuverture');
            
            Log::debug("Delete détecté - DateOuverture sauvegardée", [
                'model' => get_class($model),
                'id' => $model->id,
                'dateOuverture' => $model->preservedDateOuverture,
            ]);
        });

        // AVANT restore : désactiver l'historique
        static::restoring(function ($model) {
            $model->skipHistory = true;
            $model->deletedAtBeforeRestore = $model->deleted_at;
            $model->preservedDateOuverture = $model->getOriginal('dateOuverture');
            
            Log::debug("Restore détecté - Historique désactivé", [
                'model' => get_class($model),
                'id' => $model->id,
                'deleted_at' => $model->deleted_at,
                'dateOuverture' => $model->preservedDateOuverture,
            ]);
        });

        // APRÈS restore : réactiver l'historique et restaurer dateOuverture
        static::restored(function ($model) {
            $model->skipHistory = false;
            
            // Restaurer dateOuverture si elle a changé
            if ($model->preservedDateOuverture && 
                $model->dateOuverture != $model->preservedDateOuverture) {
                
                Log::warning("Contamination détectée après restore - Correction dateOuverture", [
                    'incident_id' => $model->id,
                    'dateOuverture_contaminee' => $model->dateOuverture,
                    'dateOuverture_correcte' => $model->preservedDateOuverture,
                ]);
                
                $model->updateQuietly([
                    'dateOuverture' => $model->preservedDateOuverture,
                ]);
            }
            
            // Enregistrer manuellement l'événement de restauration
            if ($model->deletedAtBeforeRestore) {
                $model->recordHistory('restored_trash', $model->toArray(), [
                    'deleted_at' => [
                        'old' => $model->deletedAtBeforeRestore,
                        'new' => null,
                    ]
                ]);
                
                $model->deletedAtBeforeRestore = null;
            }
            
            $model->preservedDateOuverture = null;
            
            Log::info("Restore terminé - Historique réactivé", [
                'model' => get_class($model),
                'id' => $model->id,
            ]);
        });

        // CRÉATION - Enregistrer le premier snapshot
        static::created(function ($model) {
            $model->recordHistory('created', $model->toArray());
        });

        // MODIFICATION - Enregistrer les changements
        static::updated(function ($model) {
            // Ne rien faire si on est en train de restore
            if ($model->skipHistory ?? false) {
                Log::debug("Historique ignoré (restore en cours)", [
                    'model' => get_class($model),
                    'id' => $model->id,
                ]);
                return;
            }

            if ($model->wasChanged()) {
                $changes = [];
                $excludedFields = $model->getHistoryExcludedFields();
                
                foreach ($model->getChanges() as $key => $newValue) {
                    // Ignorer les champs exclus
                    if (in_array($key, $excludedFields)) {
                        continue;
                    }

                    $oldValue = $model->getOriginal($key);

                    // Le bloc de re-parsing a été supprimé car inutile et source de bugs.
                    // Eloquent a déjà converti les dates en objets Carbon grâce au $casts du modèle.
                    $changes[$key] = [
                        'old' => $oldValue,
                        'new' => $newValue,
                    ];
                }

                if (!empty($changes)) {
                    $model->recordHistory('updated', $model->toArray(), $changes);
                }
            }
        });

        // SOFT DELETE - Mise en corbeille
        static::deleted(function ($model) {
            // Ne pas enregistrer si c'est une suppression définitive
            if (method_exists($model, 'isForceDeleting') && $model->isForceDeleting()) {
                return;
            }
            
            // Vérifier si dateOuverture a été contaminée
            if ($model->preservedDateOuverture && 
                $model->dateOuverture != $model->preservedDateOuverture) {
                
                Log::warning("Contamination détectée après delete - Correction dateOuverture", [
                    'incident_id' => $model->id,
                    'dateOuverture_contaminee' => $model->dateOuverture,
                    'dateOuverture_correcte' => $model->preservedDateOuverture,
                ]);
                
                $model->updateQuietly([
                    'dateOuverture' => $model->preservedDateOuverture,
                ]);
            }
            
            $model->preservedDateOuverture = null;
            
            $model->recordHistory('trashed', $model->toArray());
        });
    }

    /**
     * Enregistrer un événement dans l'historique
     * 
     * @param string $action Type d'action (created, updated, closed, archived, etc.)
     * @param array $snapshot État complet du modèle à ce moment
     * @param array|null $changes Champs modifiés (optionnel)
     * @param string|null $reason Raison de l'action (optionnel)
     */
    public function recordHistory(string $action, array $snapshot, ?array $changes = null, ?string $reason = null): void
    {
        $userId = $this->getUserIdForHistory();

        $snapshot = $this->formatSnapshotDates($snapshot);

        Log::info('Recording history', [
            'incident_id' => $this->id,
            'action' => $action,
            'user_id' => $userId,
        ]);

        try {
            IncidentHistory::create([
                'incident_id' => $this->id,
                'action' => $action,
                'user_id' => $userId,
                'snapshot' => $snapshot,
                'changes' => $changes,
                'reason' => $reason
            ]);
        } catch (\Exception $e) {
            Log::error("Erreur lors de l'enregistrement de l'historique", [
                'incident_id' => $this->id,
                'action' => $action,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Formate toutes les dates d'un snapshot en Europe/Paris
     */
    private function formatSnapshotDates(array $snapshot): array
    {
        $dateFields = [
            'created_at', 'updated_at', 'deleted_at', 
            'dateOuverture', 'dateCloture', 
            'archived_at', 'validated_at', 'last_sync_at'
        ];

        foreach ($dateFields as $field) {
            if (isset($snapshot[$field]) && $snapshot[$field]) {
                // Si c'est un objet Carbon
                if ($snapshot[$field] instanceof \Carbon\Carbon) {
                    $snapshot[$field] = $snapshot[$field]
                        ->copy()
                        ->setTimezone('Europe/Paris')
                        ->format('d/m/Y H:i');
                } 
                // Si c'est une string
                elseif (is_string($snapshot[$field])) {
                    try {
                        $snapshot[$field] = \Carbon\Carbon::parse($snapshot[$field])
                            ->setTimezone('Europe/Paris')
                            ->format('d/m/Y H:i');
                    } catch (\Exception $e) {
                        // Si le parsing échoue, garder la valeur originale
                        Log::debug("Erreur parsing date pour $field: " . $e->getMessage());
                    }
                }
            }
        }

        return $snapshot;
    }

    /**
     * Récupère l'ID utilisateur pour l'historique de manière fiable
     */
    protected function getUserIdForHistory(): int
    {
        if (isset($this->_historyUserId)) {
            return $this->_historyUserId;
        }

        if (Auth::check()) {
            return Auth::id();
        }

        if ($this->exists && isset($this->created_by)) {
            return $this->created_by;
        }

        return 1;
    }

    /**
     * Setter pour forcer l'user_id dans l'historique
     */
    public function setHistoryUser(int $userId): void
    {
        $this->_historyUserId = $userId;
    }

    /**
     * Relation avec l'historique
     */
    public function histories()
    {
        return $this->hasMany(IncidentHistory::class)->orderBy('created_at', 'desc');
    }

    /**
     * Actions spécifiques avec traçabilité
     */
    
    public function closeIncident(?string $reason = null): bool
    {
        $this->status = 'closed';
        $this->dateCloture = now();
        $saved = $this->save();
        
        if ($saved) {
            $this->recordHistory('closed', $this->toArray(), ['status' => 'closed'], $reason);
        }
        
        return $saved;
    }

    public function archiveIncident(?string $reason = null): bool
    {
        $this->archived = true;
        $this->archived_at = now();
        $this->archived_by = Auth::id();
        $this->archiveReason = $reason;
        $saved = $this->save();
        
        if ($saved) {
            $this->recordHistory('archived', $this->toArray(), null, $reason);
        }
        
        return $saved;
    }

    public function restoreFromArchive(?string $reason = null): bool
    {
        $this->archived = false;
        $this->archived_at = null;
        $this->archived_by = null;
        $this->archiveReason = null;
        $saved = $this->save();
        
        if ($saved) {
            $this->recordHistory('restored_archive', $this->toArray(), null, $reason);
        }
        
        return $saved;
    }
}