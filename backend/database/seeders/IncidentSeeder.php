<?php
// database/seeders/IncidentSeeder.php
namespace Database\Seeders;

use App\Models\Incident;
use App\Models\User;
use Illuminate\Database\Seeder;

class IncidentSeeder extends Seeder
{
    /**
     * Génère des incidents de test pour l'application Security-Base
     */
    public function run(): void
    {
        // Vérifier qu'on a des utilisateurs
        if (User::count() === 0) {
            $this->command->error('❌ Aucun utilisateur trouvé ! Lancez UserSeeder d\'abord.');
            return;
        }

        $this->command->info('🔄 Création des incidents de test...');

        // Récupérer les utilisateurs par rôle
        $admin = User::where('role', 'admin')->first();
        $responsable = User::where('role', 'responsable')->first();
        $technicien = User::where('role', 'technicien')->first();
        $consultant = User::where('role', 'consultant')->first();

        // ========== INCIDENTS AVEC DIFFÉRENTS STATUTS ==========

        // 1. Incident critique en cours (créé par admin)
        if ($admin) {
            Incident::factory()->create([
                'object' => 'Panne serveur critique',
                'gravity' => 'tres_grave',
                'status' => 'en_cours',
                'created_by' => $admin->id,
                'assigned_to' => $technicien?->id,
                'description' => 'Serveur principal en panne, impact production',
                'domains' => ['Sécurité du système d\'information', 'Production'],
                'actionsMenees' => ['Redémarrage du serveur', 'Vérification logs'],
                'actionsAMener' => ['Analyse approfondie', 'Mise en place monitoring']
            ]);
        }

        // 2. Incident grave en attente de validation
        if ($responsable && $technicien) {
            Incident::factory()->create([
                'object' => 'Fuite de données potentielle',
                'gravity' => 'grave',
                'status' => 'en_attente',
                'created_by' => $technicien->id,
                'assigned_to' => $responsable->id,
                'description' => 'Détection d\'accès suspects sur la base de données',
                'domains' => ['Sécurité du système d\'information'],
                'actionsMenees' => ['Blocage accès suspect', 'Audit des logs'],
                'actionsAMener' => ['Investigation approfondie', 'Rapport de sécurité']
            ]);
        }

        // 3. Incident moyen clôturé
        if ($technicien) {
            Incident::factory()->create([
                'object' => 'Problème connexion Wi-Fi',
                'gravity' => 'moyen',
                'status' => 'cloture',
                'created_by' => $technicien->id,
                'assigned_to' => $technicien->id,
                'description' => 'Connexion Wi-Fi instable dans l\'open space',
                'domains' => ['Sécurité du système d\'information'],
                'dateOuverture' => now()->subDays(3),
                'dateCloture' => now()->subDays(1),
                'actionsMenees' => ['Redémarrage routeur', 'Mise à jour firmware'],
                'actionsAMener' => []
            ]);
        }

        // 4. Incident faible archivé
        if ($consultant) {
            Incident::factory()->create([
                'object' => 'Demande changement mot de passe',
                'gravity' => 'faible',
                'status' => 'archive',
                'created_by' => $consultant->id,
                'description' => 'Utilisateur a oublié son mot de passe',
                'domains' => ['Sécurité du système d\'information'],
                'dateOuverture' => now()->subDays(10),
                'dateCloture' => now()->subDays(8),
                'archived' => true,
                'archived_at' => now()->subDays(7),
                'archived_by' => $admin?->full_name ?? 'Admin',
                'archiveReason' => 'Incident résolu et obsolète',
                'actionsMenees' => ['Réinitialisation mot de passe'],
                'actionsAMener' => []
            ]);
        }

        // 5. Incident national très grave
        if ($admin) {
            Incident::factory()->create([
                'object' => 'Coupure électrique générale',
                'gravity' => 'tres_grave',
                'status' => 'cloture',
                'isNational' => true,
                'created_by' => $admin->id,
                'assigned_to' => $admin->id,
                'description' => 'Coupure électrique ayant impacté tous les sites',
                'domains' => ['Biens & personnes', 'Production', 'Sécurité du système d\'information'],
                'publicsImpactes' => ['Cotisants', 'Personnels', 'Partenaires'],
                'sitesImpactes' => ['Clermont-Ferrand', 'Aurillac', 'Le Puy-en-Velay'],
                'dateOuverture' => now()->subDays(5),
                'dateCloture' => now()->subDays(3),
                'tempsIndisponibilite' => '2 heures',
                'actionsMenees' => [
                    'Activation plan de continuité',
                    'Communication aux usagers',
                    'Redémarrage progressif des systèmes'
                ],
                'actionsAMener' => []
            ]);
        }

        // ========== INCIDENTS GÉNÉRIQUES ==========
        // 25 incidents aléatoires avec les bons utilisateurs
        $users = User::all();
        
        if ($users->count() > 0) {
            Incident::factory(25)->create([
                'created_by' => fn() => $users->random()->id,
                'assigned_to' => fn() => $users->random()->id,
            ]);
        }

        // ========== STATISTIQUES ==========
        $total = Incident::count();
        
        $this->command->info("✅ $total incidents créés avec succès !");
        $this->command->newLine();
        
        // Stats par gravité
        $this->command->table(
            ['Gravité', 'Nombre'],
            [
                ['Faible', Incident::where('gravity', 'faible')->count()],
                ['Moyen', Incident::where('gravity', 'moyen')->count()],
                ['Grave', Incident::where('gravity', 'grave')->count()],
                ['Très Grave', Incident::where('gravity', 'tres_grave')->count()],
            ]
        );
        
        // Stats par statut
        $this->command->table(
            ['Statut', 'Nombre'],
            [
                ['En attente', Incident::where('status', 'en_attente')->count()],
                ['En cours', Incident::where('status', 'en_cours')->count()],
                ['Clôturés', Incident::where('status', 'cloture')->count()],
                ['Archivés', Incident::where('status', 'archive')->count()],
            ]
        );

        // Vérification des relations
        $avecCreateur = Incident::whereNotNull('created_by')->count();
        $avecAssigne = Incident::whereNotNull('assigned_to')->count();
        
        $this->command->info("Relations User :");
        $this->command->info("   ✅ Avec créateur : $avecCreateur");
        $this->command->info("   ✅ Avec assigné : $avecAssigne");
    }
}