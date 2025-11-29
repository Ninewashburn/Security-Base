<?php
// database/seeders/DatabaseSeeder.php
namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([

            // Roles
            RoleSeeder::class,

            // Custom Seeder for Admin Role to Dev Metier
            AddAdminRoleToDevMetierSeeder::class,

            // Custom Seeder for Pauline Rogie's Metier Role
            SpecialUserMetierRoleSeeder::class,

            // Users
            UserSeeder::class,

            // Role & metier
            MetierRoleSeeder::class,
            
            IncidentSeeder::class,
            DiffusionListSeeder::class,
            ValidatorListSeeder::class,
        ]);
    }
}