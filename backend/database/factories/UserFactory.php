<?php
// database/factories/UserFactory.php
namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserFactory extends Factory
{
    public function definition(): array
    {
        return [
            'login' => fake()->unique()->userName(),
            'email' => fake()->unique()->safeEmail(),
            'nom' => fake()->lastName(),
            'prenom' => fake()->firstName(),
            'role' => fake()->randomElement(['admin', 'responsable', 'technicien', 'consultant']),
            'site' => fake()->optional()->city(),
            'remote_user_id' => fake()->optional()->numerify('UR#######'),
            'metier_info' => null,
            'actif' => true,
            'last_sync_at' => now(),
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * Helper pour créer un utilisateur avec un rôle spécifique
     */
    public function admin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'admin',
        ]);
    }

    public function responsable(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'responsable',
        ]);
    }

    public function technicien(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'technicien',
        ]);
    }

    public function consultant(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'consultant',
        ]);
    }
}