<?php
// app/Http/Resources/UserResource.php
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'login' => $this->login,
            'email' => $this->email,
            'full_name' => $this->full_name,
            
            // Métier (depuis metier_info qui est un array JSON)
            'metier' => $this->metier ? [
                'num_metier' => $this->metier->num_metier,
                'nom_metier' => $this->metier->nom_metier,
                'code_region' => $this->metier->code_region,
            ] : null,
            
            // Rôle calculé dynamiquement depuis metier_roles
            // PEUT ÊTRE NULL si l'utilisateur n'a pas de rôle assigné
            'role_code' => $this->role_code,   // null si pas de rôle
            'role_label' => $this->role_label, // null si pas de rôle
            
            // Statut
            'actif' => $this->actif,
            
            // Dates (optionnel)
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}