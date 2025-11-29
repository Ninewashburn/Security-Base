<?php
// database/seeders/UserSeeder.php
namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // ========== UTILISATEURS DE TEST ==========
        
        // 1. Administrateur
        User::create([
            'login' => 'admin',
            'email' => 'admin-test@urssaf.fr',
            'nom' => 'Administrateur',
            'prenom' => 'Système',
            'role' => 'admin',
            'actif' => true
        ]);

        // 2. Responsable
        User::create([
            'login' => 'responsable',
            'email' => 'responsable-test@urssaf.fr',
            'nom' => 'Martin',
            'prenom' => 'Jean',
            'role' => 'responsable',
            'actif' => true
        ]);

        // 3. Technicien
        User::create([
            'login' => 'technicien',
            'email' => 'technicien-test@urssaf.fr',
            'nom' => 'Dubois',
            'prenom' => 'Marie',
            'role' => 'technicien',
            'actif' => true
        ]);

        // 4. Consultant
        User::create([
            'login' => 'consultant',
            'email' => 'consultant-test@urssaf.fr',
            'nom' => 'Bernard',
            'prenom' => 'Pierre',
            'role' => 'consultant',
            'actif' => true
        ]);

        // 5. Special user (pour test de rôle dynamique)
        User::create([
            'login' => 'special.user',
            'email' => 'special.user-test@urssaf.fr',
            'nom' => 'SPECIAL',
            'prenom' => 'User',
            'role' => 'consultant',
            'actif' => true,
            'metier_info' => [
                'num_metier' => 255,
                'nom_metier' => 'AC750-DCF-DIR-ASSISTANTE-CB',
                'code_region' => 'AC750'
            ]
        ]);

        // ========== UTILISATEURS ADDITIONNELS (optionnel) ==========
        
        // Quelques techniciens supplémentaires
        User::factory()->count(3)->create([
            'role' => 'technicien',
            'actif' => true
        ]);

        // Quelques consultants supplémentaires
        User::factory()->count(2)->create([
            'role' => 'consultant',
            'actif' => true
        ]);

        // ========== STATISTIQUES ==========
        $this->command->info('✅ UserSeeder terminé');
        $this->command->table(
            ['Rôle', 'Nombre'],
            [
                ['Admin', User::where('role', 'admin')->count()],
                ['Responsable', User::where('role', 'responsable')->count()],
                ['Technicien', User::where('role', 'technicien')->count()],
                ['Consultant', User::where('role', 'consultant')->count()],
                ['TOTAL', User::count()]
            ]
        );
    }
}