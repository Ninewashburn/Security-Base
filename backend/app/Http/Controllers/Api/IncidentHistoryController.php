<?php
// app/Http/Controllers/Api/IncidentHistoryController.php
namespace App\Http\Controllers\Api;

use App\Models\Incident;
use App\Models\User;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Carbon\Carbon;

class IncidentHistoryController extends Controller
{
    /**
     * Récupérer tout l'historique d'un incident
     */
    public function index(Incident $incident)
    {
        $histories = $incident->histories()
            ->with('user:id,nom,prenom,email')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => $histories->map(function($h) {
                // Forcer la timezone Europe/Paris pour created_at
                $createdAt = Carbon::parse($h->created_at)->setTimezone('Europe/Paris');
                
                return [
                    'id' => $h->id,
                    'action' => $h->action,
                    'action_label' => $this->getActionLabel($h->action),
                    'user' => [
                        'id' => $h->user->id ?? null,
                        'name' => ($h->user->prenom ?? '') . ' ' . ($h->user->nom ?? ''),
                        'email' => $h->user->email ?? null
                    ],
                    'snapshot' => $h->snapshot,
                    'changes' => $this->formatChanges($h->changes),
                    'reason' => $h->reason,
                    'created_at' => $createdAt->format('d/m/Y H:i'), // Format français
                    'created_at_human' => $createdAt->locale('fr')->diffForHumans()
                ];
            })
        ]);
    }

    /**
     * Récupérer un historique spécifique
     */
    public function show(Incident $incident, int $historyId)
    {
        $history = $incident->histories()
            ->with('user:id,nom,prenom,email')
            ->findOrFail($historyId);

        $createdAt = Carbon::parse($history->created_at)->setTimezone('Europe/Paris');

        return response()->json([
            'data' => [
                'id' => $history->id,
                'action' => $history->action,
                'action_label' => $this->getActionLabel($history->action),
                'user' => [
                    'id' => $history->user->id ?? null,
                    'name' => ($history->user->prenom ?? '') . ' ' . ($history->user->nom ?? ''),
                    'email' => $history->user->email ?? null
                ],
                'snapshot' => $history->snapshot,
                'changes' => $this->formatChanges($history->changes),
                'reason' => $history->reason,
                'created_at' => $createdAt->format('d/m/Y H:i'),
                'created_at_human' => $createdAt->locale('fr')->diffForHumans()
            ]
        ]);
    }

    private function getActionLabel(string $action): string
    {
        return match($action) {
            'created' => 'Création',
            'updated' => 'Modification',
            'closed' => 'Clôture',
            'archived' => 'Archivage',
            'restored_archive' => 'Restauration (archives)',
            'trashed' => 'Mise en corbeille',
            'restored_trash' => 'Restauration (corbeille)',
            default => 'Action inconnue'
        };
    }

    private function formatChanges(?array $changes): ?array
    {
        if (!$changes) {
            return null;
        }

        $formatted = [];
        $userIdFields = ['assigned_to', 'created_by', 'validateur_id', 'archived_by'];
        $dateFields = ['dateOuverture', 'dateCloture', 'created_at', 'updated_at', 'deleted_at', 'archived_at', 'validated_at']; // ✅ Déclaration ici

        foreach ($changes as $field_key => $values) {
            $oldValue = $values['old'] ?? null;
            $newValue = $values['new'] ?? null;

            // DATES - Formatter en Europe/Paris
            if (in_array($field_key, $dateFields)) {
                if ($oldValue) {
                    try {
                        $oldValue = \Carbon\Carbon::parse($oldValue)
                            ->setTimezone('Europe/Paris')
                            ->format('d/m/Y H:i');
                    } catch (\Exception $e) {
                        // Garder la valeur originale si parsing échoue
                    }
                }
                if ($newValue) {
                    try {
                        $newValue = \Carbon\Carbon::parse($newValue)
                            ->setTimezone('Europe/Paris')
                            ->format('d/m/Y H:i');
                    } catch (\Exception $e) {
                        // Garder la valeur originale si parsing échoue
                    }
                }
            }
            // UTILISATEURS - Récupérer le nom complet
            elseif (in_array($field_key, $userIdFields)) {
                $oldValue = $oldValue ? User::find($oldValue)?->full_name : null;
                $newValue = $newValue ? User::find($newValue)?->full_name : null;
            } 
            // GRAVITÉ
            elseif ($field_key === 'gravity') {
                $oldValue = $this->getGravityLabel($oldValue);
                $newValue = $this->getGravityLabel($newValue);
            } 
            // STATUT
            elseif ($field_key === 'status') {
                $oldValue = $this->getStatusLabel($oldValue);
                $newValue = $this->getStatusLabel($newValue);
            }

            // Tenter de décoder les chaînes JSON
            if (is_string($oldValue) && (str_starts_with($oldValue, '[') || str_starts_with($oldValue, '{'))) {
                $decoded = json_decode($oldValue, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $oldValue = $decoded;
                }
            }
            if (is_string($newValue) && (str_starts_with($newValue, '[') || str_starts_with($newValue, '{'))) {
                $decoded = json_decode($newValue, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $newValue = $decoded;
                }
            }

            $formatted[] = [
                'field' => $this->getFieldLabel($field_key),
                'field_key' => $field_key,
                'old_value' => $oldValue,
                'new_value' => $newValue
            ];
        }

        return $formatted;
    }

    private function getFieldLabel(string $field): string
    {
        $labels = [
            'object' => 'Objet',
            'description' => 'Description',
            'context' => 'Contexte',
            'actionsAMener' => 'Actions à mener',
            'actionsMenees' => 'Actions menées',
            'gravity' => 'Gravité',
            'status' => 'Statut',
            'dateCloture' => 'Date de clôture',
            'archived' => 'Archivé',
            'domains' => 'Domaines',
            'publicsImpactes' => 'Publics impactés',
            'sitesImpactes' => 'Sites impactés',
            'ticketNumber' => 'N° Ticket',
            'assigned_to' => 'Intervenant',
            'created_by' => 'Rédacteur',
            'validateur_id' => 'Validateur',
            'tempsIndisponibilite' => 'Temps d\'indisponibilité',
            'mailAlerte' => 'Emails d\'alerte',
            'isNational' => 'National',
            'meteo' => 'Météo',
            'lienTicketHelpy' => 'Lien Helpy',
            'lienTicketTandem' => 'Lien Tandem',
            'validation_status' => 'Statut de validation',
            'validated_at' => 'Date de validation',
            'archiveReason' => 'Raison d\'archivage',
            'template_id' => 'Template d\'incident',
            'auto_notified_emails' => 'Emails notifiés (auto)',
            'template_excluded_emails' => 'Emails exclus du template',
        ];

        return $labels[$field] ?? $field;
    }

    private function getGravityLabel(?string $gravity): ?string
    {
        if (!$gravity) return null;
        $labels = [
            'faible' => 'Faible',
            'moyen' => 'Moyen',
            'grave' => 'Grave',
            'tres_grave' => 'Très Grave',
        ];
        return $labels[$gravity] ?? $gravity;
    }

    private function getStatusLabel(?string $status): ?string
    {
        if (!$status) return null;
        $labels = [
            'en_attente' => 'En attente',
            'en_cours' => 'En cours',
            'cloture' => 'Clôturé',
            'archive' => 'Archivé',
        ];
        return $labels[$status] ?? $status;
    }
}