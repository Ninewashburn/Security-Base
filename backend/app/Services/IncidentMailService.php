<?php
// app/Services/IncidentMailService.php
namespace App\Services;

use App\Models\Incident;
use App\Models\DiffusionList;
use App\Mail\IncidentMail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class IncidentMailService
{
    /**
     * Envoi de mail pour un incident, avec une logique adaptée au type d'événement.
     */
    public function sendForIncident(Incident $incident, string $type = 'creation'): void
    {
        try {
            Log::info('Début de la logique d\'envoi d\'email', [
                'incident_id' => $incident->id,
                'type' => $type,
                'gravity' => $incident->gravity
            ]);

            $recipients = [];
            $mailType = $type;

            if ($type === 'creation') {
                if (in_array($incident->gravity, ['grave', 'tres_grave'])) {
                    // Cas 1: Création d'un incident à haute gravité -> Notifier les validateurs + la base commune (sans les listes métier)
                    $validatorRecipients = $this->getValidatorRecipients();
                    $baseRecipients = $this->gatherStandardRecipients($incident, false); // Exclut les listes "métier"

                    $recipients = array_merge($validatorRecipients, $baseRecipients);

                    $mailType = 'validation'; // Mail pour demander la validation
                    $this->handleGraveIncident($incident); // Mettre le statut "en attente"
                    
                    Log::info('Incident haute gravité créé - Email de validation envoyé', [
                        'incident_id' => $incident->id,
                        'recipients' => array_unique($recipients)
                    ]);
                } else {
                    // Cas 2: Création d'un incident faible/moyen -> Envoyer aux listes standard
                    $recipients = $this->gatherStandardRecipients($incident);
                    $mailType = 'creation';
                    
                    Log::info('Incident faible/moyenne gravité créé - Email envoyé aux listes standard', [
                        'incident_id' => $incident->id
                    ]);
                }
            } elseif ($type === 'validation') {
                // Cas 3: Un incident grave/très grave est créé/requalifié -> Notifier les validateurs
                $recipients = $this->getValidatorRecipients();
                $mailType = 'validation'; // Mail pour demander la validation
                $this->handleGraveIncident($incident); // S'assurer que le statut est "en attente"
                
                Log::info('Incident grave/très grave requalifié - Email de validation envoyé', [
                    'incident_id' => $incident->id,
                    'recipients' => array_unique($recipients)
                ]);
            } else {
                // Autres types d'événements (clôture, etc.)
                $recipients = $this->gatherStandardRecipients($incident);
                $mailType = $type;
                
                Log::info('Autre type d\'événement - Email envoyé aux listes standard', [
                    'incident_id' => $incident->id,
                    'type' => $type
                ]);
            }

            // Nettoyer la liste des destinataires et envoyer l'email
            $finalRecipients = array_unique(array_filter($recipients));

            if (!empty($finalRecipients)) {
                Mail::to($finalRecipients)->send(new IncidentMail($incident, $mailType));
                Log::info("Email d'incident envoyé avec succès", [
                    'incident_id' => $incident->id,
                    'recipients_count' => count($finalRecipients),
                    'recipients' => $finalRecipients,
                    'mail_type' => $mailType
                ]);
            } else {
                Log::info('Aucun destinataire trouvé pour cet événement.', [
                    'incident_id' => $incident->id,
                    'mail_type' => $mailType
                ]);
            }

        } catch (\Exception $e) {
            Log::error("Erreur lors de l'envoi de l'email d'incident", [
                'incident_id' => $incident->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * Collecte les destinataires standards pour un incident (listes métier, créateur, etc.).
     * Utilisé pour incidents faible/moyen à la création, et grave/très grave après validation.
     */
private function gatherStandardRecipients(Incident $incident, bool $includeMetierLists = true): array
{
    $allRecipients = [];

    // 1. Emails des listes de diffusion (personnelles et/ou métier)
    if (class_exists('\App\Models\DiffusionList')) {
        $query = DiffusionList::where('actif', true);

        // Logique de filtrage conditionnelle
        if ($includeMetierLists) {
            $query->where('type', 'metier')
                  ->where('gravite', $incident->gravity);
        } else {
            // Si les listes métier ne sont pas incluses, ne rien retourner de cette requête.
            // On ajoute une condition qui sera toujours fausse.
            $query->whereRaw('1 = 0');
        }

        $candidateLists = $query->get();

        $diffusionLists = [];

        foreach ($candidateLists as $list) {
            // Pour les listes de type "métier", appliquer les filtres
            if ($list->type === 'metier') {
                $domainsOnList = $list->domains ?? [];
                $sitesOnList = $list->sites ?? [];
                
                // La liste est valide si elle n'a pas de critère (joker) OU si elle a une intersection
                $domainMatch = empty($domainsOnList) || !empty(array_intersect($incident->domains ?? [], $domainsOnList));
                $siteMatch = empty($sitesOnList) || !empty(array_intersect($incident->sitesImpactes ?? [], $sitesOnList));

                if ($domainMatch && $siteMatch) {
                    $diffusionLists[] = $list;
                }
            } else {
                // Pour les autres types (ex: 'personnelle'), on les inclut toujours
                $diffusionLists[] = $list;
            }
        }

        foreach ($diffusionLists as $list) {
            $emails = is_array($list->emails) 
                ? $list->emails 
                : (json_decode($list->emails, true) ?? []);
            
            $allRecipients = array_merge($allRecipients, $emails);
        }
    }

    // 2. Fusionner les emails manuels et automatiques de l'incident
    $manualEmails = $incident->mailAlerte ?? [];
    $autoEmails = $incident->auto_notified_emails ?? [];
    $allUserEmails = array_merge($manualEmails, $autoEmails);

    if (!empty($allUserEmails)) {
        $allRecipients = array_merge($allRecipients, $allUserEmails);
    }

    // 3. Ajouter automatiquement le créateur et l'intervenant
    $incident->load(['creator', 'assignee']);

    if ($incident->creator && $incident->creator->email) {
        $allRecipients[] = $incident->creator->email;
    }
    if ($incident->assignee && $incident->assignee->email) {
        $allRecipients[] = $incident->assignee->email;
    }

    // 4. Exclure les emails que l'utilisateur a retirés manuellement
    $excludedEmails = $incident->template_excluded_emails ?? [];
    if (!empty($excludedEmails)) {
        $allRecipients = array_values(array_diff($allRecipients, $excludedEmails));
    }

    Log::info("Destinataires collectés (solution simplifiée)", [
        'incident_id' => $incident->id,
        'total_recipients' => count(array_unique($allRecipients)),
        'mailAlerte_contains' => count($allUserEmails) . ' emails (manuels + template fusionnés)'
    ]);

    return $allRecipients;
}

    /**
     * Gestion incidents graves (attente validation)
     */
    private function handleGraveIncident(Incident $incident): void
    {
        try {
            // Marquer comme en attente de validation
            $incident->update(['status' => 'en_attente']);

            Log::info('Incident marqué en attente validation', [
                'incident_id' => $incident->id,
                'gravity' => $incident->gravity
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur gestion incident grave', [
                'incident_id' => $incident->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Récupère la liste des destinataires pour la validation.
     * Ces personnes recevront les mails pour valider les incidents GRAVE/TRÈS GRAVE.
     */
    public function getValidatorRecipients(): array
    {
        try {
            $validatorList = DiffusionList::where('type', 'validator')->first();

            if ($validatorList && !empty($validatorList->emails)) {
                // Le champ emails est déjà un tableau grâce au cast dans le modèle
                return $validatorList->emails;
            }

            Log::warning('La liste de diffusion des validateurs (type: validator) n\'a pas été trouvée ou est vide.');
            return [];

        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération des destinataires validateurs: ' . $e->getMessage());
            return []; // Retourner un tableau vide en cas d'erreur
        }
    }

    /**
     * Méthode spécifique pour envoyer après validation d'un incident grave
     * Utilisée par le contrôleur de validation
     */
    public function sendAfterValidation(Incident $incident): void
    {
        $this->sendForIncident($incident, 'validation');
    }
}