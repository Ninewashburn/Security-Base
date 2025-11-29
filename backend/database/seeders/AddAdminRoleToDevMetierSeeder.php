<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AddAdminRoleToDevMetierSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('metier_roles')->updateOrInsert(
            ['num_metier' => 321],
            ['role_id' => 1,
            'created_at' => now(),
            'updated_at' => now(),]
        );
    }
}