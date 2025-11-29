<?php
// app/Http/Controllers/Api/IncidentController.php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Incident;
use App\Models\User;
use Illuminate\Http\Request;
use App\Http\Resources\IncidentResource;
use App\Services\IncidentMailService;
use App\Models\DiffusionList;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class IncidentController extends Controller
{
    private IncidentMailService $mailService;

    public function __construct(IncidentMailService $mailService)
    {
        $this->mailService = $mailService;
    }

    // ===== CRUD STANDARD =====

    /**
     * Liste des incidents avec filtres
     */
    public function index(Request $request)
    {
        // Log::info('IncidentController@index called', $request->all());

        $query = Incident::with(['creator', 'assignee'])->orderBy('dateOuverture', 'desc');

        // Filtres par date
        $this->applyDateFilters($query, $request);

        // Gestion archives vs actifs
        $showArchived = $request->boolean('show_archived', false);
        if ($showArchived) {
            $query->where('status', 'archive');
            // Log::info('Loading archived incidents only');
        } else {
            $query->where('status', '!=', 'archive');
            // Log::info('Loading active incidents only');
        }

        $incidents = $query->get();

        // Log::info('Query result', [
        //     'total_found' => $incidents->count(),
        //     'show_archived' => $showArchived
        // ]);

        return response()->json([
            'data' => IncidentResource::collection($incidents),
            'meta' => [
                'total' => $incidents->count(),
                'show_archived' => $showArchived
            ]
        ]);
    }

    /**
     * Création d'un incident avec envoi email automatique
     */
    public function store(Request $request)
    {
        // Capturer l'utilisateur depuis Request (JWT/middleware custom)
        $authenticatedUser = $request->user();
        
        Log::info('Creating incident', [
            'user_id' => $authenticatedUser?->id,
            'user_name' => $authenticatedUser?->full_name,
            'has_user' => $authenticatedUser !== null
        ]);

        $validatedData = $this->validateIncidentData($request);

        // Créer ou récupérer l'utilisateur depuis les données Angular
        $user = $this->getOrCreateUser(
            $request->input('created_by_login'),
            $request->input('created_by_name'),
            $request->input('created_by_email')
        );
        
        $validatedData['created_by'] = $user->id;        

        // Mesure défensive : s'assurer que les champs de type array sont bien des tableaux
        $arrayFields = ['domains', 'publicsImpactes', 'sitesImpactes', 'actionsMenees', 'actionsAMener', 'mailAlerte', 'auto_notified_emails', 'template_excluded_emails'];
        foreach ($arrayFields as $field) {
            if (!isset($validatedData[$field])) {
                $validatedData[$field] = [];
            }
        }

        // Charger les emails du template si un template_id est fourni
        if (!empty($validatedData['template_id'])) {
            $template = DiffusionList::find($validatedData['template_id']);

            // S'assurer que c'est bien un template ('personnelle') et qu'il a des emails
            if ($template && $template->type === 'personnelle' && !empty($template->emails)) {
                // Fusionner les emails du template avec ceux déjà présents
                $validatedData['auto_notified_emails'] = array_unique(
                    array_merge($validatedData['auto_notified_emails'] ?? [], $template->emails)
                );
            }
        }

        // Créer l'incident et forcer l'utilisateur pour l'historique
        $incident = new Incident($validatedData);
        
        // Si un utilisateur est authentifié, on l'utilise pour l'historique
        if ($authenticatedUser) {
            $incident->setHistoryUser($authenticatedUser->id);
        }
        
        $incident->save();

        // Email automatique de création
        $this->sendEmailSafely($incident, 'creation', 'Email automatique envoyé pour nouvel incident');

        return new IncidentResource($incident->load(['creator', 'assignee']));
    }

    /**
     * Affichage d'un incident spécifique
     */
    public function show(Incident $incident)
    {
        return new IncidentResource($incident->load(['creator', 'assignee']));
    }

    /**
     * Mise à jour d'un incident avec sécurité validation
     */
    public function update(Request $request, Incident $incident)
    {
        // Sécurité : Empêcher bypass de la validation
        $this->checkValidationSecurity($incident, $request);

        $originalGravity = $incident->gravity;
        $originalStatus = $incident->status;

        $validatedData = $this->validateIncidentData($request);

        // Créer ou récupérer l'utilisateur intervenant
        $user = $this->getOrCreateUser(
            $request->input('assigned_to_login'),
            $request->input('assigned_to_name'),
            $request->input('assigned_to_email')
        );
        
        $validatedData['assigned_to'] = $user->id;

        // Définir l'utilisateur pour l'historique.
        // On utilise l'intervenant car Auth::user() n'est pas fiable dans les événements de modèle.
        $incident->setHistoryUser($user->id);

        $incident->update($validatedData);

        // Emails conditionnels selon les changements
        $this->handleUpdateNotifications($incident, $originalGravity, $originalStatus);

        return new IncidentResource($incident->load(['creator', 'assignee']));
    }

    // ===== GESTION ÉTAT DES INCIDENTS =====

    /**
     * Archiver un incident
     */
    public function archive(Request $request, Incident $incident)
    {
        $authenticatedUser = $request->user();

        if ($authenticatedUser) {
            $incident->setHistoryUser($authenticatedUser->id);
        }

        $incident->update([
            'status' => 'archive',
            'archived' => true,
            'archived_at' => now(),
            'archived_by' => $authenticatedUser ? $authenticatedUser->id : null,
            'archiveReason' => $request->input('reason', 'Archived by user'),
        ]);

        $this->sendEmailSafely($incident, 'archive', 'Email archivage envoyé');

        return new IncidentResource($incident->load(['creator', 'assignee']));
    }

    /**
     * Désarchiver un incident
     */
    public function unarchive(Request $request, Incident $incident)
    {
        // Capturer l'utilisateur depuis Request
        $authenticatedUser = $request->user();
        if ($authenticatedUser) {
            $incident->setHistoryUser($authenticatedUser->id);
        }

        $incident->update([
            'status' => 'cloture',
            'archived' => false,
            'archived_at' => null,
            'archived_by' => null,
            'archiveReason' => null,
        ]);

        $this->sendEmailSafely($incident, 'unarchive', 'Email de restauration envoyé');

        return new IncidentResource($incident->load(['creator', 'assignee']));
    }

    /**
     * Valider un incident grave/très grave
     */
    public function validate(Request $request, Incident $incident)
    {
        try {
            // Capturer l'utilisateur depuis Request
            $authenticatedUser = $request->user();
            if ($authenticatedUser) {
                $incident->setHistoryUser($authenticatedUser->id);
            }

            Log::info('Début validation incident', [
                'incident_id' => $incident->id,
                'gravity' => $incident->gravity,
                'status' => $incident->status
            ]);

            // Vérifications
            if (!in_array($incident->gravity, ['grave', 'tres_grave'])) {
                return response()->json([
                    'message' => 'Cet incident ne nécessite pas de validation'
                ], 400);
            }

            // Mise à jour
            $incident->update([
                'status' => 'en_cours',
                'validated_at' => now()
            ]);

            Log::info('Incident validé avec succès', [
                'incident_id' => $incident->id,
                'new_status' => 'en_cours'
            ]);

            // Email optionnel de validation
            $this->sendEmailSafely($incident, 'validated', 'Email validation envoyé');

            return response()->json([
                'message' => 'Incident validé avec succès',
                'incident' => new IncidentResource($incident->load(['creator', 'assignee']))
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur validation incident', [
                'incident_id' => $incident->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'message' => 'Erreur lors de la validation : ' . $e->getMessage()
            ], 500);
        }
    }

    // ===== GESTION CORBEILLE =====

    /**
     * Mise en corbeille (soft delete)
     */
    public function softDelete(Request $request, Incident $incident)
    {
        // Capturer l'utilisateur depuis Request
        $authenticatedUser = $request->user();
        if ($authenticatedUser) {
            $incident->setHistoryUser($authenticatedUser->id);
        }

        $incident->delete();
        
        return response()->json([
            'message' => "L'incident #{$incident->id} a été mis en corbeille"
        ]);
    }



    /**
     * Liste des incidents dans la corbeille
     */
    public function trashed()
    {
        $incidents = Incident::onlyTrashed()
            ->with(['creator', 'assignee'])
            ->orderBy('deleted_at', 'desc')
            ->get();

        return response()->json([
            'data' => IncidentResource::collection($incidents),
            'meta' => [
                'total' => $incidents->count()
            ]
        ]);
    }

    /**
     * Restauration depuis la corbeille
     */
    public function restore(Request $request, Incident $incident)
    {
        // Capturer l'utilisateur depuis Request
        $authenticatedUser = $request->user();
        if ($authenticatedUser) {
            $incident->setHistoryUser($authenticatedUser->id);
        }

        $incident->restore();

        $this->sendEmailSafely($incident, 'trash_restore', 'Email de restauration depuis corbeille envoyé');
        
        return response()->json([
            'data' => new IncidentResource($incident),
            'message' => "L'incident #{$incident->id} a été restauré"
        ]);
    }

    /**
     * Suppression définitive depuis la corbeille
     */
    public function destroyTrashed($id)
    {
        $incident = Incident::onlyTrashed()->findOrFail($id);

        // Capturer l'utilisateur depuis Request
        $authenticatedUser = request()->user();
        if ($authenticatedUser) {
            $incident->setHistoryUser($authenticatedUser->id);
        }

        $this->sendEmailSafely($incident, 'force_delete', 'Email de suppression définitive envoyé');

        $incident->forceDelete();
        
        return response()->json([
            'message' => "L'incident #{$id} a été supprimé définitivement"
        ]);
    }

    // ===== MÉTHODES UTILITAIRES PRIVÉES =====

    /**
     * Validation centralisée des données d'incident
     */
    private function validateIncidentData(Request $request): array
    {
        return $request->validate([
            'object' => 'required|string|max:255',
            'domains' => 'nullable|array',
            'gravity' => 'required|string|in:faible,moyen,grave,tres_grave',
            'status' => 'required|string|max:255',
            'isNational' => 'required|boolean',
            'ticketNumber' => 'nullable|string|max:255',
            'lienTicketHelpy' => 'nullable|string|max:255',
            'lienTicketTandem' => 'nullable|string|max:255',
            'redacteur' => 'nullable|string|max:255',
            'intervenant' => 'nullable|string|max:255',
            'meteo' => 'nullable|boolean',
            'publicsImpactes' => 'nullable|array',
            'sitesImpactes' => 'nullable|array',
            'description' => 'nullable|string',
            'actionsMenees' => 'nullable|array',
            'actionsAMener' => ['nullable', 'array', function ($attribute, $value, $fail) use ($request) {
                if (!in_array($request->input('status'), ['cloture', 'archive']) && empty($value)) {
                    $fail('Le champ Actions à mener est obligatoire lorsque le statut n\'est pas clôturé ou archivé.');
                }
            }],
            'tempsIndisponibilite' => 'nullable|string|max:255',
            'mailAlerte' => 'nullable|array',
            'mailAlerte.*' => 'email',
            'auto_notified_emails' => 'nullable|array',
            'auto_notified_emails.*' => 'email',
            'template_excluded_emails' => 'nullable|array',
            'template_excluded_emails.*' => 'email',
            'dateOuverture' => 'required|date',
            'dateCloture' => 'nullable|date',
            'template_id' => 'nullable|integer|exists:incident_templates,id',

            // Champs pour l'utilisateur
            'created_by_login' => 'nullable|string',
            'created_by_name' => 'nullable|string',
            'created_by_email' => 'nullable|email',
            'assigned_to_login' => 'nullable|string',
            'assigned_to_name' => 'nullable|string',
            'assigned_to_email' => 'nullable|email',
        ]);
    }

    /**
     * Appliquer les filtres de date à la query
     */
    private function applyDateFilters($query, Request $request): void
    {
        if ($request->filled('dateFrom')) {
            $query->whereDate('dateOuverture', '>=', $request->input('dateFrom'));
        }
        if ($request->filled('dateTo')) {
            $query->whereDate('dateOuverture', '<=', $request->input('dateTo'));
        }
    }

    /**
     * Sécurité : vérifier bypass de validation
     */
    private function checkValidationSecurity(Incident $incident, Request $request): void
    {
        $isBeingDowngraded = in_array($request->input('gravity'), ['moyen', 'faible']);

        if ($incident->status === 'en_attente' && 
            $request->input('status') !== 'en_attente' &&
            !$isBeingDowngraded) {
            throw ValidationException::withMessages([
                'status' => 'Cet incident nécessite une validation officielle. Utilisez le bouton "Valider" dans la liste des incidents.'
            ]);
        }
    }

    /**
     * Traitement du template d'email avec variables
     */
    private function processEmailTemplate(Incident $incident): void
    {
        if ($incident->mailAlerte && str_contains($incident->mailAlerte, '{')) {
            $processedTemplate = str_replace(
                ['{object}', '{id}'],
                [$incident->object, $incident->id],
                $incident->mailAlerte
            );
            
            $incident->update(['mailAlerte' => $processedTemplate]);
        }
    }

    /**
     * Envoi d'email sécurisé (ne fait pas échouer l'opération)
     */
    private function sendEmailSafely(Incident $incident, string $type, string $successMessage): void
    {
        try {
            $this->mailService->sendForIncident($incident, $type);
            Log::info($successMessage, [
                'incident_id' => $incident->id,
                'gravity' => $incident->gravity,
                'object' => $incident->object
            ]);
        } catch (\Exception $e) {
            Log::error("Erreur envoi email {$type}", [
                'incident_id' => $incident->id,
                'error' => $e->getMessage()
            ]);
            // Ne pas faire échouer l'opération principale
        }
    }

    /**
     * Gestion des emails de mise à jour selon les changements
     */
    private function handleUpdateNotifications(Incident $incident, string $originalGravity, string $originalStatus): void
    {
        $emailType = $this->determineEmailType($incident, $originalGravity, $originalStatus);
        
        if ($emailType) {
            $this->sendEmailSafely($incident, $emailType, "Email {$emailType} envoyé");
        }
    }

    /**
     * Déterminer le type d'email selon les changements
     */
    private function determineEmailType(Incident $incident, string $originalGravity, string $originalStatus): ?string
    {
        // Priorité 1 : Changement vers cloturé
        if ($incident->status === 'cloture' && $originalStatus !== 'cloture') {
            return 'cloture';
        }

        // Priorité 2 : Changement vers archivé
        if ($incident->status === 'archive' && $originalStatus !== 'archive') {
            return 'archive';
        }

        // Priorité 3 : Gravité augmentée vers grave/très grave
        if (in_array($incident->gravity, ['grave', 'tres_grave']) && 
            !in_array($originalGravity, ['grave', 'tres_grave'])) {
            return 'validation';
        }

        // Priorité 4 : Rétrogradation d'un incident en attente de validation
        if ($originalStatus === 'en_attente' &&
            in_array($originalGravity, ['grave', 'tres_grave']) && 
            in_array($incident->gravity, ['moyen', 'faible'])) {
            return 'downgraded';
        }

        // Pour toutes les autres modifications, ne pas envoyer d'email
        return null;
    }

    /**
     * Obtenir l'ID utilisateur courant
     */
    private function getCurrentUserId(Request $request): int
    {
        if (!$request->user()) {
            throw new \Exception('User not authenticated - JWT token missing or invalid');
        }

        return $request->user()->id;
    }

    /**
     * Obtenir le nom utilisateur courant
     */
    private function getCurrentUserName(Request $request): string
    {
        if (!$request->user()) {
            throw new \Exception('User not authenticated');
        }

        return $request->user()->full_name ?? $request->user()->name ?? 'Unknown';
    }

    /**
     * Créer ou récupérer un utilisateur
     */
    private function getOrCreateUser(string $login, string $fullName, string $email): User
    {
        // Séparer prénom et nom
        $nameParts = explode(' ', $fullName, 2);
        $prenom = $nameParts[0] ?? '';
        $nom = $nameParts[1] ?? $nameParts[0];
        
        return User::firstOrCreate(
            ['login' => $login],
            [
                'nom' => $nom,
                'prenom' => $prenom,
                'email' => $email,
                'role' => 'admin',
                'actif' => true,
                'last_sync_at' => now(),
            ]
        );
    }
}