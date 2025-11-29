<?php
// app/Mail/IncidentMail.php
namespace App\Mail;

use App\Models\Incident;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class IncidentMail extends Mailable
{
    use Queueable, SerializesModels;

    public Incident $incident;
    public string $type;

    /**
     * Créer une nouvelle instance avec l'incident
     */
    public function __construct(Incident $incident, string $type = 'creation')
    {
        $this->incident = $incident;
        $this->type = $type;
    }

    /**
     * Sujet de l'email dynamique selon le type et la gravité
     */
    public function envelope(): Envelope
    {
        $subject = match ($this->type) {
            'creation' => 'Nouvel incident sécurité',
            'validation' => 'VALIDATION REQUISE - Incident grave',
            'validated' => 'INCIDENT VALIDÉ - Traitement autorisé',
            'update' => 'Incident mis à jour',
            'cloture' => 'Incident clôturé',
            'archive' => 'Incident archivé',
            'unarchive' => 'Incident restauré depuis les archives',
            'soft_delete' => 'Incident déplacé vers la corbeille',
            'trash_restore' => 'Incident restauré depuis la corbeille',
            'force_delete' => 'INCIDENT SUPPRIMÉ DÉFINITIVEMENT',
            
            default => 'Incident sécurité'
        };

        return new Envelope(
            subject: $subject . " - {$this->incident->object}",
        );
    }

    /**
     * Template email avec données de l'incident
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.incident',
            with: [
                'incident' => $this->incident,
                'type' => $this->type,
                'gravityLabel' => $this->getGravityLabel(),
                'statusLabel' => $this->getStatusLabel(),
                'statusDisplay' => $this->getStatusWithValidation(),
                'creatorName' => $this->incident->creator->full_name ?? 'Non défini',
                'assigneeName' => $this->incident->assignee->full_name ?? 'Non assigné'
            ]
        );
    }

    /**
     * Pièces jointes
     */
    public function attachments(): array
    {
        return [];
    }

    // Utilitaires pour le template
    private function getGravityLabel(): string
    {
        return match ($this->incident->gravity) {
            'faible' => 'Faible',
            'moyen' => 'Moyen',
            'grave' => 'Grave',
            'tres_grave' => 'Très Grave',
            default => 'Non définie'
        };
    }

    private function getStatusLabel(): string
    {
        return match ($this->incident->status) {
            'ouvert' => 'Ouvert',
            'en_cours' => 'En cours',
            'cloture' => 'Clôturé',
            'ferme' => 'Fermé',
            'archive' => 'Archivé',
            'en_attente' => 'En attente de validation',
            default => 'Inconnu'
        };
    }

    /**
     * Gestion intelligente du statut selon validation
     */
    private function getStatusWithValidation(): string
    {
        $baseStatus = $this->getStatusLabel();

        if ($this->incident->status === 'en_attente') {
            return 'En attente de validation';
        }

        if ($this->incident->status === 'en_cours' && in_array($this->incident->gravity, ['grave', 'tres_grave'])) {
            // Si une date de validation existe, l'incident est validé.
            if ($this->incident->validated_at) {
                return $baseStatus . ' (validé)';
            }
            // Sinon, il est en attente.
            return $baseStatus . ' (en attente de validation)';
        }

        return $baseStatus;
    }
}