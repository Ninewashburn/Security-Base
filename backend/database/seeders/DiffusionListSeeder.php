<?php
// database/seeders/DiffusionListSeeder.php
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\DiffusionList;
use Illuminate\Support\Facades\DB;

class DiffusionListSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // ✅ Désactiver les contraintes de clés étrangères temporairement
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        
        // Vider la table pour repartir de zéro
        DiffusionList::truncate();
        
        // ✅ Réactiver les contraintes
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');
        
        // Récupérer les domaines depuis la source de vérité pour assurer la cohérence
        $domains = array_values(DiffusionList::getAvailableDomains());
        $domainProd = $domains[0]; // "Production"
        $domainBnP = $domains[1];  // "Biens & personnes"
        $domainSecu = $domains[2]; // "Sécurité du système d'information"
        
        // Définir les 4 listes spécifiques (mails fictifs)
        $listsToCreate = [
            [
                'name' => 'Notifications Production - Faible',
                'type' => 'metier',
                'gravite' => 'faible',
                'domains' => [$domainProd],
                'emails' => ['equipe.prod.niveau1-test@urssaf.fr'],
                'description' => 'Notifications pour les incidents de production à faible impact.',
                'actif' => true,
                'auto_include_service_users' => false,
            ],
            [
                'name' => 'Alertes Sécurité Physique - Moyen',
                'type' => 'metier',
                'gravite' => 'moyen',
                'domains' => [$domainBnP],
                'emails' => ['securite.physique-test@urssaf.fr', 'responsable.site-test@urssaf.fr'],
                'description' => 'Alertes pour les équipes de sécurité des biens et des personnes.',
                'actif' => true,
                'auto_include_service_users' => true,
            ],
            [
                'name' => 'Incidents Majeurs - Prod & Sécu SI',
                'type' => 'metier',
                'gravite' => 'grave',
                'domains' => [$domainProd, $domainSecu],
                'emails' => ['responsable.prod-test@urssaf.fr', 'rssi-test@urssaf.fr'],
                'description' => 'Pour les incidents graves touchant la production et la sécurité informatique.',
                'actif' => true,
                'auto_include_service_users' => true,
            ],
            [
                'name' => 'Alerte Générale - Très Grave',
                'type' => 'metier',
                'gravite' => 'tres_grave',
                'domains' => $domains, // Tous les domaines
                'emails' => ['direction-test@urssaf.fr', 'cossi-test@urssaf.fr'],
                'description' => 'Alerte générale pour la direction et le COSSI sur les incidents critiques.',
                'actif' => true,
                'auto_include_service_users' => true,
            ]
        ];
        
        // Créer chaque liste
        foreach ($listsToCreate as $listData) {
            DiffusionList::create($listData);
        }
        
        // Message de confirmation
        $this->command->info(count($listsToCreate) . ' listes de diffusion spécifiques ont été créées avec succès.');
    }
}