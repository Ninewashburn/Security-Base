<?php
// app/Http/Controllers/Api/DiffusionListController.php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DiffusionList;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;

class DiffusionListController extends Controller
{
    /**
     * Récupérer toutes les listes de diffusion
     */
    public function index(Request $request): JsonResponse
    {
        try {
            // Exclure le type 'validator' de la liste générale
            $query = DiffusionList::where('type', '!=', 'validator')
                                  ->with(['service', 'creator', 'updater']);

            // Filtres optionnels
            if ($request->filled('type')) {
                $query->where('type', $request->type);
            }

            if ($request->filled('gravite')) {
                $query->where('gravite', $request->gravite);
            }

            if ($request->filled('actif')) {
                $query->where('actif', $request->boolean('actif'));
            }

            if ($request->filled('domain')) {
                $query->whereJsonContains('domains', $request->domain);
            }

            $lists = $query->orderBy('created_at', 'desc')->get();

            return response()->json([
                'success' => true,
                'data' => $lists->map(function ($list) {
                    return [
                        'id' => $list->id,
                        'name' => $list->name,
                        'type' => $list->type, // Préserver le type tel qu'il est en base
                        'gravite' => $list->gravite,
                        'domains' => $list->domains ?? [],
                        'sites' => $list->sites ?? [],
                        'emails' => $list->emails ?? [],
                        'service_id' => $list->service_id,
                        'description' => $list->description,
                        'actif' => (bool)$list->actif,
                        'auto_include_service_users' => (bool)$list->auto_include_service_users,
                        'created_at' => $list->created_at?->format('Y-m-d H:i:s'),
                        'updated_at' => $list->updated_at?->format('Y-m-d H:i:s'),
                        // Champs calculés
                        'final_emails_count' => count($list->final_emails ?? []),
                        'service_name' => $list->service?->name
                    ];
                })
            ], 200);

        } catch (\Exception $e) {
            \Log::error('Erreur lors de la récupération des listes de diffusion', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des listes de diffusion',
                'error' => config('app.debug') ? $e->getMessage() : 'Erreur serveur'
            ], 500);
        }
    }

    /**
     * Créer une nouvelle liste de diffusion
     */
    public function store(Request $request): JsonResponse
    {
        try {
            // Ne pas forcer le type à 'metier'
            $type = $request->get('type');

            if ($type === 'validator') {
                return response()->json([
                    'success' => false,
                    'message' => 'La création d\'une liste de type \'validator\' n\'est pas autorisée via cette route.'
                ], 403);
            }
            
            // Validation du type obligatoire
            if (!$type || !in_array($type, ['metier', 'personnelle', 'validator'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Type de liste requis (metier ou personnelle)',
                    'errors' => ['type forcing' => ['Le type de liste est obligatoire et doit être metier ou personnelle']]
                ], 422);
            }
            
            $rules = $this->getValidationRules($type);
            
            $validator = Validator::make($request->all(), $rules);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            $data = $validator->validated();

            // Préserver le type original
            $data['type'] = $type;
            $data['domains'] = $data['domains'] ?? [];
            $data['sites'] = $data['sites'] ?? [];
            $data['emails'] = $data['emails'] ?? [];
            $data['actif'] = $data['actif'] ?? true;
            $data['auto_include_service_users'] = $data['auto_include_service_users'] ?? false;

            // Pour les listes personnelles, bien nettoyer les champs
            if ($type === 'personnelle') {
                $data['gravite'] = null;
                $data['domains'] = [];
                $data['sites'] = [];
                $data['auto_include_service_users'] = false;
            }
            
            \Log::info('Création liste de diffusion - Données finales:', [
                'name' => $data['name'],
                'type' => $data['type'],
                'gravite' => $data['gravite'],
                'emails' => $data['emails']
            ]);
            
            $data['created_by'] = 1; // TODO: Auth::id() quand auth sera en place
            $data['updated_by'] = 1; // TODO: Auth::id() quand auth sera en place

            $list = DiffusionList::create($data);

            \Log::info('Liste de diffusion créée avec succès:', [
                'id' => $list->id,
                'type' => $list->type,
                'gravite' => $list->gravite,
                'emails_count' => count($list->emails ?? [])
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Liste de diffusion créée avec succès',
                'data' => [
                    'id' => $list->id,
                    'name' => $list->name,
                    'type' => $list->type,
                    'gravite' => $list->gravite,
                    'domains' => $list->domains ?? [],
                    'sites' => $list->sites ?? [],
                    'emails' => $list->emails ?? [],
                    'service_id' => $list->service_id,
                    'description' => $list->description,
                    'actif' => (bool)$list->actif,
                    'auto_include_service_users' => (bool)$list->auto_include_service_users,
                    'created_at' => $list->created_at->format('Y-m-d H:i:s'),
                    'updated_at' => $list->updated_at->format('Y-m-d H:i:s')
                ]
            ], 201);

        } catch (\Exception $e) {
            \Log::error('Erreur lors de la création de la liste de diffusion', [
                'error' => $e->getMessage(),
                'data' => $request->all(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création',
                'error' => config('app.debug') ? $e->getMessage() : 'Erreur serveur'
            ], 500);
        }
    }

    /**
     * Mettre à jour une liste de diffusion
     */
    public function update(Request $request, DiffusionList $diffusionList): JsonResponse
    {
        // On ne peut pas modifier la liste des validateurs par cette route
        if ($diffusionList->type === 'validator') {
            return response()->json([
                'success' => false,
                'message' => 'La liste des validateurs ne peut pas être modifiée via cette route.'
            ], 403);
        }

        try {
            // Préserver le type existant si non spécifié
            $type = $request->get('type', $diffusionList->type);
            
            // Validation du type
            if (!in_array($type, ['metier', 'personnelle', 'validator'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Type de liste invalide',
                    'errors' => ['type' => ['Le type doit être metier ou personnelle']]
                ], 422);
            }
            
            $rules = $this->getValidationRules($type, $diffusionList->id);
            
            $validator = Validator::make($request->all(), $rules);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            $data = $validator->validated();
            
            // Assurer la cohérence du type
            $data['type'] = $type;
            $data['domains'] = $data['domains'] ?? [];
            $data['sites'] = $data['sites'] ?? [];
            $data['emails'] = $data['emails'] ?? [];
            $data['updated_by'] = 1; // TODO: Auth::id()

            // Pour les listes personnelles, nettoyer UNIQUEMENT si c'est personnel
            if ($type === 'personnelle') {
                $data['gravite'] = null;
                $data['domains'] = [];
                $data['sites'] = [];
                $data['auto_include_service_users'] = false;
            }

            \Log::info('Mise à jour liste de diffusion:', [
                'id' => $diffusionList->id,
                'type_original' => $diffusionList->type,
                'type_final' => $data['type'],
                'emails_count' => count($data['emails'])
            ]);

            $diffusionList->update($data);
            $diffusionList->refresh();

            return response()->json([
                'success' => true,
                'message' => 'Liste de diffusion mise à jour avec succès',
                'data' => [
                    'id' => $diffusionList->id,
                    'name' => $diffusionList->name,
                    'type' => $diffusionList->type,
                    'gravite' => $diffusionList->gravite,
                    'domains' => $diffusionList->domains ?? [],
                    'sites' => $diffusionList->sites ?? [],
                    'emails' => $diffusionList->emails ?? [],
                    'service_id' => $diffusionList->service_id,
                    'description' => $diffusionList->description,
                    'actif' => (bool)$diffusionList->actif,
                    'auto_include_service_users' => (bool)$diffusionList->auto_include_service_users,
                    'updated_at' => $diffusionList->updated_at->format('Y-m-d H:i:s')
                ]
            ], 200);

        } catch (\Exception $e) {
            \Log::error('Erreur lors de la mise à jour de la liste de diffusion', [
                'error' => $e->getMessage(),
                'list_id' => $diffusionList->id,
                'data' => $request->all(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour',
                'error' => config('app.debug') ? $e->getMessage() : 'Erreur serveur'
            ], 500);
        }
    }

    /**
     * Supprimer une liste de diffusion
     */
    public function destroy(DiffusionList $diffusionList): JsonResponse
    {
        try {
            $name = $diffusionList->name;
            $diffusionList->delete();

            return response()->json([
                'success' => true,
                'message' => "Liste de diffusion \"{$name}\" supprimée avec succès"
            ], 200);

        } catch (\Exception $e) {
            \Log::error('Erreur lors de la suppression de la liste de diffusion', [
                'error' => $e->getMessage(),
                'list_id' => $diffusionList->id,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression',
                'error' => config('app.debug') ? $e->getMessage() : 'Erreur serveur'
            ], 500);
        }
    }

    /**
     * Afficher une liste spécifique avec détails complets
     */
    public function show(DiffusionList $diffusionList): JsonResponse
    {
        try {
            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $diffusionList->id,
                    'name' => $diffusionList->name,
                    'type' => $diffusionList->type,
                    'gravite' => $diffusionList->gravite,
                    'domains' => $diffusionList->domains ?? [],
                    'sites' => $diffusionList->sites ?? [],
                    'emails' => $diffusionList->emails ?? [],
                    'service_id' => $diffusionList->service_id,
                    'description' => $diffusionList->description,
                    'actif' => (bool)$diffusionList->actif,
                    'auto_include_service_users' => (bool)$diffusionList->auto_include_service_users,
                    'created_at' => $diffusionList->created_at?->format('Y-m-d H:i:s'),
                    'updated_at' => $diffusionList->updated_at?->format('Y-m-d H:i:s'),
                    // Champs calculés
                    'final_emails' => $diffusionList->final_emails ?? [],
                    'final_emails_count' => count($diffusionList->final_emails ?? []),
                    'service' => $diffusionList->service,
                    'creator' => $diffusionList->creator?->only(['id', 'name', 'email']),
                    'updater' => $diffusionList->updater?->only(['id', 'name', 'email'])
                ]
            ], 200);

        } catch (\Exception $e) {
            \Log::error('Erreur lors de la récupération de la liste de diffusion', [
                'error' => $e->getMessage(),
                'list_id' => $diffusionList->id,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération',
                'error' => config('app.debug') ? $e->getMessage() : 'Erreur serveur'
            ], 500);
        }
    }

    /**
     * Récupérer les options de configuration
     */
    public function options(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'gravities' => DiffusionList::getAvailableGravities(),
                'domains' => DiffusionList::getAvailableDomains(),
                'types' => [
                    'metier' => 'Liste métier (complète)',
                    'personnelle' => 'Liste personnelle (libre)'
                ]
            ]
        ], 200);
    }

    /**
     * Règles de validation conditionnelles selon le type
     */
    private function getValidationRules(string $type, ?int $excludeId = null): array
    {
        $nameRule = 'required|string|max:255|unique:diffusion_lists,name';
        if ($excludeId) {
            $nameRule .= ',' . $excludeId;
        }

        $baseRules = [
            'name' => $nameRule,
            'type' => 'required|in:metier,personnelle,validator',
            'emails' => 'nullable|array',
            'emails.*' => 'email:rfc,dns',
            'service_id' => 'nullable|exists:services,id',
            'description' => 'nullable|string|max:1000',
            'actif' => 'boolean'
        ];

        if ($type === 'metier') {
            // Règles strictes pour listes métier
            $baseRules = array_merge($baseRules, [
                'gravite' => 'required|in:faible,moyen,grave,tres_grave',
                'domains' => 'nullable|array',
                'domains.*' => 'string|in:' . implode(',', array_keys(DiffusionList::getAvailableDomains())),
                'sites' => 'nullable|array',
                'sites.*' => 'string',
                'auto_include_service_users' => 'boolean'
            ]);
        } else {
            // Règles souples pour listes personnelles - gravité NULLABLE
            $baseRules = array_merge($baseRules, [
                'gravite' => 'nullable', // Pas de validation sur la gravité pour personnel
                'domains' => 'nullable|array',
                'sites' => 'nullable|array',
                'auto_include_service_users' => 'nullable|boolean'
            ]);
        }

        return $baseRules;
    }

    /**
     * Récupérer la liste de diffusion des validateurs
     */
    public function getValidatorList(): JsonResponse
    {
        try {
            $validatorList = DiffusionList::where('type', 'validator')->first();

            if (!$validatorList) {
                return response()->json(['success' => false, 'message' => 'La liste des validateurs n\'a pas été trouvée.'], 404);
            }

            return response()->json(['success' => true, 'data' => $validatorList]);

        } catch (\Exception $e) {
            \Log::error('Erreur lors de la récupération de la liste des validateurs', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Erreur serveur'], 500);
        }
    }

    /**
     * Mettre à jour la liste de diffusion des validateurs
     */
    public function updateValidatorList(Request $request): JsonResponse
    {

        $validator = Validator::make($request->all(), [
            'emails' => 'present|array',
            'emails.*' => 'required|email:rfc,dns',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Données invalides', 'errors' => $validator->errors()], 422);
        }

        try {
            $validatorList = DiffusionList::where('type', 'validator')->firstOrFail();
            
            $validatorList->emails = $request->emails;
            $validatorList->updated_by = 1; // TODO: Auth::id()
            $validatorList->save();

            return response()->json(['success' => true, 'message' => 'Liste des validateurs mise à jour.', 'data' => $validatorList]);

        } catch (\Exception $e) {
            \Log::error('Erreur lors de la mise à jour de la liste des validateurs', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Erreur serveur'], 500);
        }
    }
}