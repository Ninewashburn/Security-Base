<?php
// database/seeders/MetierRoleSeeder.php
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Role;
use Illuminate\Support\Facades\Schema;

class MetierRoleSeeder extends Seeder
{
    /**
     * Remplit la table de liaison 'metier_roles' avec les mappages
     * prédéfinis entre un numéro de métier et un code de rôle.
     * Cette version est autonome et ne dépend PAS d'une table 'metiers'.
     */
    public function run(): void
    {
        // Vider la table de liaison pour un re-seeding propre
        Schema::disableForeignKeyConstraints();
        DB::table('metier_roles')->truncate();
        Schema::enableForeignKeyConstraints();

        // 1. Récupérer les rôles de la BDD pour avoir leurs IDs
        $roles = Role::all()->keyBy('code');

        // 2. Définir ici les associations que vous voulez créer.
        // C'est ici que vous dites "tel numéro de métier a tel rôle".
        $metierToRoleMap = [
            // num_metier => 'code_du_role'
            321 => 'admin', // Corresponds à 'UR837-CDD DEV INFORMATIQUE'
            98 => 'admin', // Corresponds à 'UR837-RESPONSABLE INFORMATIQUE'
            167 => 'admin', // Corresponds à 'UR837-MANAGER DE PROXIMITE ET DPO'
            168 => 'admin', // Corresponds à 'UR837-ADJOINT RESPONSABLE INFORMATIQUE TECH'
            111 => 'technicien', // Corresponds à 'UR837-TECHNICIEN INFORMATIQUE'
            165 => 'animateur', // Corresponds à 'UR837-GESTIONNAIRE PROJETS INFORMATIQUE'
        ];

        $inserted = 0;
        foreach ($metierToRoleMap as $numMetier => $roleCode) {
            // Vérifier que le rôle existe avant de tenter de l'insérer
            if (isset($roles[$roleCode])) {
                DB::table('metier_roles')->insert([
                    'num_metier' => $numMetier,
                    'role_id' => $roles[$roleCode]->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $inserted++;
            } else {
                $this->command->warn("Le rôle '{$roleCode}' n'a pas été trouvé. Le mappage pour le métier n°{$numMetier} a été ignoré.");
            }
        }

        $this->command->info("✅ {$inserted} associations métier-rôle ont été créées.");
    }
}