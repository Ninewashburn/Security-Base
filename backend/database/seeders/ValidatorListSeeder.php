<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\DiffusionList;
use Illuminate\Support\Facades\DB;

class ValidatorListSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DiffusionList::updateOrCreate(
            ['type' => 'validator'],
            [
                'name' => 'Liste des validateurs',
                'description' => 'Liste des adresses email pour la validation des incidents graves et très graves.',
                'emails' => [
                    'chef.service-test@urssaf.fr',
                    'responsable.securite-test@urssaf.fr',
                    'validateur.incident-test@urssaf.fr'
                ],
                'actif' => true,
            ]
        );
    }
}
