<?php
// app/Http/Resources/IncidentHistoryResource.php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class IncidentHistoryResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray($request): array
    {
        // Récupérer l'historique précédent pour avoir les anciennes valeurs
        $previousHistory = \App\Models\IncidentHistory::where('incident_id', $this->incident_id)
            ->where('id', '<', $this->id)
            ->orderBy('id', 'desc')
            ->first();

        // Transformer les changes pour inclure old_value et new_value
        $formattedChanges = [];
        if ($this->changes && is_array($this->changes)) {
            foreach ($this->changes as $field => $newValue) {
                $oldValue = null;
                
                // Chercher l'ancienne valeur dans le snapshot précédent
                if ($previousHistory && isset($previousHistory->snapshot[$field])) {
                    $oldValue = $previousHistory->snapshot[$field];
                }
                
                $formattedChanges[] = [
                    'field_key' => $field,
                    'field' => $this->formatFieldName($field),
                    'old_value' => $oldValue,
                    'new_value' => $newValue,
                ];
            }
        }

        return [
            'id' => $this->id,
            'incident_id' => $this->incident_id,
            'action' => $this->action,
            'action_label' => $this->getActionLabel($this->action),
            'user' => [
                'id' => $this->user->id,
                'name' => $this->user->full_name ?? $this->user->name ?? 'Système',
                'email' => $this->user->email,
            ],
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
            'created_at_human' => $this->created_at->diffForHumans(),
            'reason' => $this->reason,
            'changes' => $formattedChanges,
            'snapshot' => $this->snapshot,
        ];
    }

    /**
     * Formate le nom d'un champ pour l'affichage
     */
    private function formatFieldName(string $field): string
    {
        $labels = [
            'status' => 'Statut',
            'gravity' => 'Gravité',
            'description' => 'Description',
            'object' => 'Objet',
            'dateOuverture' => 'Date d\'ouverture',
            'dateCloture' => 'Date de clôture',
            'actionsMenees' => 'Actions menées',
            'actionsAMener' => 'Actions à mener',
            'domains' => 'Domaines',
            'publicsImpactes' => 'Publics impactés',
            'sitesImpactes' => 'Sites impactés',
            'mailAlerte' => 'Emails d\'alerte',
            'tempsIndisponibilite' => 'Temps d\'indisponibilité',
            'isNational' => 'National',
            'meteo' => 'Météo',
            'ticketNumber' => 'Numéro de ticket',
            'lienTicketHelpy' => 'Lien Helpy',
            'lienTicketTandem' => 'Lien Tandem',
        ];

        return $labels[$field] ?? $field;
    }

    /**
     * Retourne le label d'une action
     */
    private function getActionLabel(string $action): string
    {
        $labels = [
            'created' => 'Création',
            'updated' => 'Modification',
            'closed' => 'Clôture',
            'archived' => 'Archivage',
            'restored_archive' => 'Restauration depuis archive',
            'trashed' => 'Mise en corbeille',
            'restored_trash' => 'Restauration depuis corbeille',
            'validated' => 'Validation',
            'downgraded' => 'Rétrogradation',
        ];

        return $labels[$action] ?? ucfirst($action);
    }
}