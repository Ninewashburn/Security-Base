<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;
use Illuminate\Support\Facades\DB;

class FixAdminRoleSeeder extends Seeder
{
    public function run()
    {
        $adminRole = Role::where('code', 'admin')->first();
        
        if (!$adminRole) {
            $this->command->error('Rôle admin introuvable !');
            return;
        }
        
        // Restaurer l'admin pour les métiers dev
        $devMetiers = [321, 57]; // CDD DEV et GESTIONNAIRE PROJETS
        
        foreach ($devMetiers as $numMetier) {
            DB::table('metier_roless')->updateOrInsert(
                ['num_metier' => $numMetier],
                [
                    'role_id' => $adminRole->id,
                    'updated_at' => now()
                ]
            );
        }
        
        $this->command->info('✅ Rôles admin restaurés !');
    }
}