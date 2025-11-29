<?php
// app/Http/Resources/IncidentResource.php
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Log;

class IncidentResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {

        return [
            // ID et timestamps
            'id' => $this->id,
            'createdAt' => $this->created_at ? $this->created_at->timezone('UTC')->setTimezone(config('app.timezone'))->toISOString() : null,
            'updated_at' => $this->updated_at ? $this->updated_at->timezone('UTC')->setTimezone(config('app.timezone'))->toISOString() : null,
            'deleted_at' => $this->deleted_at ? $this->deleted_at->timezone('UTC')->setTimezone(config('app.timezone'))->toISOString() : null,

            // Champs principaux
            'object' => $this->object,
            'domains' => $this->domains,
            'gravity' => $this->gravity,
            'gravityLabel' => $this->gravity_label,
            'gravityColor' => $this->gravity_color,
            'status' => $this->status,
            'statusLabel' => $this->status_label,

            // Dates
            'dateOuverture' => $this->dateOuverture ? $this->dateOuverture->timezone('UTC')->setTimezone(config('app.timezone'))->toISOString() : null,
            'dateCloture' => $this->dateCloture ? $this->dateCloture->timezone('UTC')->setTimezone(config('app.timezone'))->toISOString() : null,
            'validated_at' => $this->validated_at ? $this->validated_at->timezone('UTC')->setTimezone(config('app.timezone'))->toISOString() : null,

            // Tickets
            'ticketNumber' => $this->ticketNumber,
            'lienTicketHelpy' => $this->lienTicketHelpy,
            'lienTicketTandem' => $this->lienTicketTandem,

            // Template id de diffusion-list
            'template_id' => $this->template_id,

            // Personnes  
            'creator' => new UserResource($this->whenLoaded('creator')),
            'assignee' => new UserResource($this->whenLoaded('assignee')),

            // Météo et impacts
            'meteo' => $this->meteo,
            'publicsImpactes' => $this->publicsImpactes,
            'sitesImpactes' => $this->sitesImpactes,
            'isNational' => $this->isNational,

            // Descriptions
            'description' => $this->description,
            'actionsMenees' => $this->actionsMenees,
            'actionsAMener' => $this->actionsAMener,
            'tempsIndisponibilite' => $this->tempsIndisponibilite,

            // Archivage
            'archived' => $this->archived,
            'archived_at' => $this->archived_at ? $this->archived_at->timezone('UTC')->setTimezone(config('app.timezone'))->toISOString() : null,
            'archived_by' => $this->archived_by,
            'archiveReason' => $this->archiveReason,

            // Mail
            'mailAlerte' => $this->mailAlerte ?? [],
            'auto_notified_emails' => $this->auto_notified_emails ?? [],
            'template_excluded_emails' => $this->template_excluded_emails ?? [],
            'notified_emails' => $this->notified_emails ?? [],

            // Champs calculés
            'has_pending_actions' => $this->has_pending_actions,
        ];
    }
}
