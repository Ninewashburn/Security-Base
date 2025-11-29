<?php
// database/factories/IncidentFactory.php
namespace Database\Factories;

use App\Models\Incident;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class IncidentFactory extends Factory
{
    protected $model = Incident::class;

    public function definition(): array
    {
        // Listes de valeurs réalistes
        $gravites = ['faible', 'moyen', 'grave', 'tres_grave'];
        $statuts = ['en_attente', 'en_cours', 'cloture', 'archive'];
        $domaines = ['Biens & personnes', 'Production', 'Sécurité du système d\'information'];
        $publics = ['Cotisants', 'Personnels', 'Partenaires'];
        $sites = ['Clermont-Ferrand', 'Aurillac', 'Le Puy-en-Velay', 'Moulins', 'Centre PAJEMPLOI', 'CNV'];

        // Variables calculées
        $dateOuverture = $this->faker->dateTimeBetween('-6 months', 'now');
        $status = $this->faker->randomElement($statuts);
        $gravity = $this->faker->randomElement($gravites);
        $status = $this->getStatusForGravity($gravity);
        $isNational = $this->faker->boolean(30);

        // Dates cohérentes
        $dateCloture = in_array($status, ['cloture', 'archive']) 
            ? $this->faker->dateTimeBetween($dateOuverture, 'now') 
            : null;
            
        $archived_at = $status === 'archive' 
            ? $this->faker->dateTimeBetween($dateCloture ?: $dateOuverture, 'now') 
            : null;

        // Sites selon National
        $sitesImpactes = $isNational ? [] : $this->faker->randomElements($sites, rand(1, 3));

        // Temps d'indisponibilité
        $tempsIndispo = null;
        if ($this->faker->boolean(50)) {
            $heures = $this->faker->numberBetween(0, 48);
            $minutes = $this->faker->numberBetween(0, 59);
            $tempsIndispo = sprintf('%dh%02d', $heures, $minutes);
        }

        // ========== RELATIONS USERS ==========
        $creator = $this->getRandomCreator();
        $assignee = $this->faker->boolean(70) ? $this->getRandomActiveUser() : null;

        return [
            // Relations
            'created_by' => $creator->id,
            'assigned_to' => $assignee?->id,

            // Champs principaux
            'object' => $this->faker->randomElement([
                'Panne serveur critique',
                'Accès réseau interrompu',
                'Application métier inaccessible',
                'Problème de base de données',
                'Attaque par hameçonnage détectée',
                'Défaillance système de sauvegarde',
                'Lenteurs généralisées',
                'Mise à jour logicielle échouée',
                'Dysfonctionnement imprimante réseau'
            ]),
            'domains' => $this->faker->randomElements($domaines, rand(1, 2)),
            'gravity' => $gravity,
            'status' => $status,

            // Dates
            'dateOuverture' => $dateOuverture,
            'dateCloture' => $dateCloture,

            // Tickets
            'ticketNumber' => $this->faker->boolean(60) ? 'UR' . $this->faker->randomNumber(6) : null,
            'lienTicketHelpy' => $this->faker->boolean(40) ? 'https://helpy.urssaf.fr/ticket/' . $this->faker->randomNumber(5) : null,
            'lienTicketTandem' => null,

            // Impacts
            'meteo' => $this->faker->boolean(20),
            'publicsImpactes' => $this->faker->randomElements($publics, rand(1, 2)),
            'isNational' => $isNational,
            'sitesImpactes' => $sitesImpactes,

            // Description
            'description' => $this->faker->paragraph(3),
            'actionsMenees' => $this->faker->boolean(70) 
                ? $this->faker->sentences(2) 
                : [],
            'actionsAMener' => in_array($status, ['cloture', 'archive']) 
                ? [] 
                : $this->faker->sentences(2),
            'tempsIndisponibilite' => $tempsIndispo,

            // Validation (pour incidents graves)
            'validated_at' => in_array($gravity, ['grave', 'tres_grave']) && $status !== 'en_attente'
                ? $this->faker->dateTimeBetween($dateOuverture, 'now')
                : null,

            // Archivage
            'archived' => $status === 'archive',
            'archived_at' => $archived_at,
            'archived_by' => $status === 'archive' ? $creator->full_name : null,
            'archiveReason' => $status === 'archive' ? 'Archivage automatique' : null,

            // Emails
            'mailAlerte' => [],
            'auto_notified_emails' => [],
            'template_excluded_emails' => [],
        ];
    }

    /**
     * Récupère un utilisateur qui peut créer des incidents
     */
    private function getRandomCreator(): User
    {
        $creator = User::query()
            ->where('actif', true)
            ->whereIn('role', ['admin', 'responsable', 'technicien'])
            ->inRandomOrder()
            ->first();

        // Fallback : créer un admin si aucun user trouvé
        if (!$creator) {
            $creator = User::factory()->create([
                'role' => 'admin',
                'actif' => true
            ]);
        }

        return $creator;
    }

    /**
     * Récupère un utilisateur actif au hasard
     */
    private function getRandomActiveUser(): ?User
    {
        return User::query()
            ->where('actif', true)
            ->inRandomOrder()
            ->first();
    }

    /**
     * State : Incident grave nécessitant validation
     */
    public function grave(): static
    {
        return $this->state(fn (array $attributes) => [
            'gravity' => $this->faker->randomElement(['grave', 'tres_grave']),
            'status' => 'en_attente',
            'validated_at' => null,
        ]);
    }

    /**
     * State : Incident clôturé
     */
    public function closed(): static
    {
        return $this->state(function (array $attributes) {
            $dateOuverture = $attributes['dateOuverture'] ?? now()->subDays(5);
            
            return [
                'status' => 'cloture',
                'dateCloture' => $this->faker->dateTimeBetween($dateOuverture, 'now'),
                'actionsAMener' => [],
            ];
        });
    }

    /**
     * State : Incident archivé
     */
    public function archived(): static
    {
        return $this->state(function (array $attributes) {
            $dateOuverture = $attributes['dateOuverture'] ?? now()->subDays(10);
            $dateCloture = $this->faker->dateTimeBetween($dateOuverture, now()->subDays(3));
            
            return [
                'status' => 'archive',
                'dateCloture' => $dateCloture,
                'archived' => true,
                'archived_at' => $this->faker->dateTimeBetween($dateCloture, 'now'),
                'archived_by' => $this->getRandomCreator()->full_name,
                'archiveReason' => 'Archivage automatique',
                'actionsAMener' => [],
            ];
        });
    }
    /**
     * Retourne un statut cohérent selon la gravité
     */
    private function getStatusForGravity(string $gravity): string
    {
        // Incidents graves/très graves : peuvent être en attente de validation
        if (in_array($gravity, ['grave', 'tres_grave'])) {
            return $this->faker->randomElement([
                'en_attente',  // Nécessite validation
                'en_cours',
                'cloture',
                'archive'
            ]);
        }
        
        // Incidents faibles/moyens : jamais en attente
        return $this->faker->randomElement([
            'en_cours',
            'cloture',
            'archive'
        ]);
    }
}