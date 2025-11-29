<?php
// app/Services/IncidentTemplateService.php
namespace App\Services;

use App\Models\IncidentTemplate;
use Illuminate\Support\Facades\Log;

class IncidentTemplateService
{
    /**
     * Récupérer tous les templates actifs pour la liste déroulante
     */
    public function getActiveTemplatesForDropdown(): array
    {
        return IncidentTemplate::active()
            ->with('diffusionList')
            ->ordered()
            ->get()
            ->map(function ($template) {
                return [
                    'id' => $template->id,
                    'nom_objet' => $template->nom_objet,
                    'actions_count' => $template->actions_count,
                    'description' => $template->description,
                    'diffusion_list_id' => $template->diffusion_list_id,
                    'diffusion_list_name' => $template->diffusionList?->name
                ];
            })->toArray();
    }

    /**
     * Récupérer un template avec ses actions formatées
     */
    public function getTemplateWithActions(int $templateId): ?array
    {
        $template = IncidentTemplate::with('diffusionList')->find($templateId);
        
        if (!$template || !$template->actif) {
            return null;
        }

        return [
            'id' => $template->id,
            'nom_objet' => $template->nom_objet,
            'description' => $template->description,
            'actions' => $template->formatted_actions,
            'diffusion_list_id' => $template->diffusion_list_id,
            'diffusion_list_name' => $template->diffusionList?->name,
            'diffusion_list_emails' => $template->diffusionList?->emails ?? []
        ];
    }

    /**
     * Créer un nouveau template
     */
    public function createTemplate(array $data, int $userId): IncidentTemplate
    {
        Log::info("Création template: {$data['nom_objet']} par utilisateur #{$userId}");

        $template = new IncidentTemplate();
        $template->nom_objet = $data['nom_objet'];
        $template->actions = $data['actions'] ?? [];
        $template->diffusion_list_id = $data['diffusion_list_id'] ?? null;
        $template->created_by = $userId;
        $template->updated_by = $userId;
        $template->actif = true;
        $template->save();

        return $template;
    }

    /**
     * Mettre à jour un template
     */
    public function updateTemplate(int $templateId, array $data, int $userId): bool
    {
        $template = IncidentTemplate::find($templateId);
        
        if (!$template) {
            return false;
        }

        $template->nom_objet = $data['nom_objet'];
        $template->actions = $data['actions'] ?? [];
        $template->diffusion_list_id = $data['diffusion_list_id'] ?? null;
        $template->updated_by = $userId;
        $template->save();
        
        Log::info("Template #{$templateId} mis à jour par utilisateur #{$userId}");
        
        return true;
    }

    /**
     * Supprimer (désactiver) un template
     */
    public function deleteTemplate(int $templateId, int $userId): bool
    {
        $template = IncidentTemplate::find($templateId);
        
        if (!$template) {
            return false;
        }

        $template->update([
            'actif' => false,
            'updated_by' => $userId
        ]);

        Log::info("Template #{$templateId} désactivé par utilisateur #{$userId}");
        
        return true;
    }

    /**
     * Lister tous les templates pour l'administration
     */
    public function getAllTemplatesForAdmin(): array
    {
        return IncidentTemplate::with(['creator', 'updater'])
            ->ordered()
            ->get()
            ->map(function ($template) {
                return [
                    'id' => $template->id,
                    'nom_objet' => $template->nom_objet,
                    'description' => $template->description,
                    'actions_count' => $template->actions_count,
                    'actif' => $template->actif,
                    'created_by' => $template->creator?->full_name,
                    'updated_by' => $template->updater?->full_name,
                    'created_at' => $template->created_at?->format('d/m/Y H:i'),
                    'updated_at' => $template->updated_at?->format('d/m/Y H:i')
                ];
            })->toArray();
    }
}