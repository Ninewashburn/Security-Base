<?php
// database/factories/DiffusionListFactory.php
namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\DiffusionList;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\DiffusionList>
 */
class DiffusionListFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = DiffusionList::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        // Domaines disponibles (identiques à ceux d'Angular)
        $availableDomains = array_values(DiffusionList::getAvailableDomains());
        
        // Gravités disponibles
        $gravities = ['faible', 'moyen', 'grave', 'tres_grave'];
        
        // Sélectionner 1 à 3 domaines aléatoirement
        $selectedDomains = fake()->randomElements($availableDomains, fake()->numberBetween(1, 3));
        
        // Générer 2 à 5 emails pour la liste
        $emails = [];
        $emailCount = fake()->numberBetween(2, 5);
        for ($i = 0; $i < $emailCount; $i++) {
            $emails[] = fake()->unique()->safeEmail();
        }

        return [
            'name' => fake()->words(3, true) . ' - Liste Diffusion',
            'gravite' => fake()->randomElement($gravities),
            'domains' => $selectedDomains,
            'emails' => $emails,
            'service_id' => null,
            'description' => fake()->optional(0.7)->sentence(10),
            'actif' => fake()->boolean(85),
            'auto_include_service_users' => fake()->boolean(60),
            'created_by' => null,
            'updated_by' => null
        ];
    }

    /**
     * Factory pour les listes critiques (production uniquement)
     */
    public function critical(): static
    {
        return $this->state(fn (array $attributes) => [
            'gravite' => 'tres_grave',
            'domains' => ['production'],
            'actif' => true,
            'auto_include_service_users' => true,
            'description' => 'Liste critique pour incidents de production majeurs'
        ]);
    }

    /**
     * Factory pour les listes sécurité SI
     */
    public function securitySI(): static
    {
        return $this->state(fn (array $attributes) => [
            'gravite' => fake()->randomElement(['grave', 'tres_grave']),
            'domains' => ['sécurité SI'],
            'emails' => [
                'rssi@urssaf.fr',
                'securite.si@urssaf.fr',
                'copil.ssi@urssaf.fr'
            ],
            'actif' => true,
            'auto_include_service_users' => true
        ]);
    }

    /**
     * Factory pour les listes biens & personnes
     */
    public function physicalSecurity(): static
    {
        return $this->state(fn (array $attributes) => [
            'gravite' => fake()->randomElement(['moyen', 'grave']),
            'domains' => ['biens & personnes'],
            'emails' => [
                'securite.physique@urssaf.fr',
                'rh@urssaf.fr',
                'maintenance@urssaf.fr'
            ],
            'actif' => true,
            'auto_include_service_users' => false
        ]);
    }

    /**
     * Factory pour les listes multi-domaines
     */
    public function multiDomain(): static
    {
        return $this->state(fn (array $attributes) => [
            'domains' => ['production', 'biens & personnes', 'sécurité SI'],
            'gravite' => fake()->randomElement(['moyen', 'grave']),
            'auto_include_service_users' => true
        ]);
    }
}