<?php
// app/Http/Controllers/Api/IncidentTemplateController.php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\IncidentTemplateService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Http\JsonResponse;

class IncidentTemplateController extends Controller
{
    public function __construct(
        private IncidentTemplateService $templateService
    ) {}

    /**
     * GET /api/incident-templates
     * Pour la liste déroulante du formulaire
     */
    public function index(): JsonResponse
    {
        try {
            $templates = $this->templateService->getActiveTemplatesForDropdown();
            
            return response()->json([
                'success' => true,
                'data' => $templates,
                'count' => count($templates)
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des templates'
            ], 500);
        }
    }

    /**
     * GET /api/incident-templates/{id}
     * Récupérer un template avec ses actions
     */
    public function show(int $id): JsonResponse
    {
        try {
            $template = $this->templateService->getTemplateWithActions($id);
            
            if (!$template) {
                return response()->json([
                    'success' => false,
                    'message' => 'Template introuvable ou inactif'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $template
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération du template'
            ], 500);
        }
    }

    /**
     * POST /api/incident-templates
     * Créer un nouveau template
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'nom_objet' => [
                'required',
                'string',
                'max:255',
                Rule::unique('incident_templates', 'nom_objet')->whereNull('deleted_at'),
            ],
            'actions' => 'required|array|min:1',
            'actions.*.action' => 'required|string',
            'diffusion_list_id' => 'nullable|integer|exists:diffusion_lists,id'
        ]);

        try {
            $template = $this->templateService->createTemplate(
                $request->all(),
                1
                // auth()->id()
            );

            return response()->json([
                'success' => true,
                'message' => 'Template créé avec succès',
                'data' => [
                    'id' => $template->id,
                    'nom_objet' => $template->nom_objet
                ]
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création du template'
            ], 500);
        }
    }

    /**
     * PUT /api/incident-templates/{id}
     * Modifier un template
     */
    public function update(Request $request, int $id): JsonResponse
    {
        \Illuminate\Support\Facades\Log::info('IncidentTemplateController@update: Received data', $request->all());
        $request->validate([
            'nom_objet' => [
                'required',
                'string',
                'max:255',
                Rule::unique('incident_templates', 'nom_objet')
                    ->ignore($id)
                    ->whereNull('deleted_at'),
            ],
            'actions' => 'required|array|min:1',
            'actions.*.action' => 'required|string',
            'diffusion_list_id' => 'nullable|integer|exists:diffusion_lists,id'
        ]);

        try {
            $success = $this->templateService->updateTemplate(
                $id,
                $request->all(),
                1 // TODO: Remplacer par auth()->id() une fois l'authentification API fonctionnelle
            );

            if (!$success) {
                return response()->json([
                    'success' => false,
                    'message' => 'Template introuvable'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Template modifié avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la modification du template'
            ], 500);
        }
    }

    /**
     * DELETE /api/incident-templates/{id}
     * Supprimer (désactiver) un template
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $success = $this->templateService->deleteTemplate($id, 1); // TODO: Remplacer par auth()->id()

            if (!$success) {
                return response()->json([
                    'success' => false,
                    'message' => 'Template introuvable'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Template supprimé avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression du template'
            ], 500);
        }
    }

    /**
     * GET /api/incident-templates-admin
     * Pour la gestion administrative (tous les templates)
     */
    public function admin(): JsonResponse
    {
        try {
            $templates = $this->templateService->getAllTemplatesForAdmin();
            
            return response()->json([
                'success' => true,
                'data' => $templates,
                'count' => count($templates)
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des templates'
            ], 500);
        }
    }
}