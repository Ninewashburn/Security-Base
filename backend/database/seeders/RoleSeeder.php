<?php
// database/seeders/RoleSeeder.php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Solution pour SQLite : Désactiver les contraintes FK
        Schema::disableForeignKeyConstraints();
        
        // Supprimer tous les rôles existants (compatible SQLite)
        DB::table('roles')->delete();
        
        Schema::enableForeignKeyConstraints();

        $roles = [
            [
                'code' => 'admin',
                'label' => 'Administrateur',
                'description' => 'Accès complet à toutes les fonctionnalités du système',
                'permissions' => json_encode([
                    'can_create' => true,
                    'can_modify' => true,
                    'can_view_archives' => true,
                    'can_view_trash' => true,
                    'can_view_dashboard' => true,
                    'can_soft_delete' => true,
                    'can_force_delete' => true,
                    'can_view_all' => true,
                    'can_validate' => true,
                    'can_manage_emails' => true,
                    'can_export' => true,
                    'can_archive' => true,
                    'can_unarchive' => true,
                    'can_restore_from_trash' => true,
                    'can_view_history' => true,
                ]),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code' => 'responsable',
                'label' => 'Responsable',
                'description' => 'Gestion des équipes et validation des processus',
                'permissions' => json_encode([
                    'can_create' => true,
                    'can_modify' => true,
                    'can_view_archives' => true,
                    'can_view_trash' => true,
                    'can_view_dashboard' => false,
                    'can_soft_delete' => true,
                    'can_force_delete' => false,
                    'can_view_all' => true,
                    'can_validate' => true,
                    'can_manage_emails' => true,
                    'can_export' => true,
                    'can_archive' => true,
                    'can_unarchive' => true,
                    'can_restore_from_trash' => true,
                    'can_view_history' => true,
                ]),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code' => 'technicien',
                'label' => 'Technicien',
                'description' => 'Réalisation des interventions techniques',
                'permissions' => json_encode([
                    'can_create' => true,
                    'can_modify' => true,
                    'can_view_archives' => true,
                    'can_view_trash' => true,
                    'can_view_dashboard' => false,
                    'can_soft_delete' => true,
                    'can_force_delete' => false,
                    'can_view_all' => true,
                    'can_validate' => false,
                    'can_manage_emails' => false,
                    'can_export' => false,
                    'can_archive' => false,
                    'can_unarchive' => false,
                    'can_restore_from_trash' => false,
                    'can_view_history' => true,
                ]),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code' => 'animateur',
                'label' => 'Animateur',
                'description' => 'Animation et suivi des projets',
                'permissions' => json_encode([
                    'can_create' => false,
                    'can_modify' => false,
                    'can_view_archives' => true,
                    'can_view_trash' => true,
                    'can_view_dashboard' => false,
                    'can_soft_delete' => false,
                    'can_force_delete' => false,
                    'can_view_all' => true,
                    'can_validate' => false,
                    'can_manage_emails' => false,
                    'can_export' => false,
                    'can_archive' => false,
                    'can_unarchive' => false,
                    'can_restore_from_trash' => false,
                    'can_view_history' => true,
                ]),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code' => 'consultant',
                'label' => 'Consultant',
                'description' => 'Accès en lecture seule aux données',
                'permissions' => json_encode([
                    'can_create' => false,
                    'can_modify' => false,
                    'can_view_archives' => false,
                    'can_view_trash' => false,
                    'can_view_dashboard' => false,
                    'can_soft_delete' => false,
                    'can_force_delete' => false,
                    'can_view_all' => true,
                    'can_validate' => false,
                    'can_manage_emails' => false,
                    'can_export' => true,
                    'can_archive' => false,
                    'can_unarchive' => false,
                    'can_restore_from_trash' => false,
                    'can_view_history' => false,
                ]),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        foreach ($roles as $role) {
            DB::table('roles')->insert($role);
        }

        $this->command->info('✅ 5 rôles créés avec succès');
    }
}