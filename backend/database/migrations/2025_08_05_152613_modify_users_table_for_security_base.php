<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Migration pour créer/modifier la table users pour Security-Base
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // AJOUTER les nouvelles colonnes nécessaires
            if (!Schema::hasColumn('users', 'login')) {
                $table->string('login')->unique()->after('id');
            }
            
            if (!Schema::hasColumn('users', 'nom')) {
                $table->string('nom', 100)->after('email');
            }
            
            if (!Schema::hasColumn('users', 'prenom')) {
                $table->string('prenom', 100)->after('nom');
            }
            
            // ✅ Rôle en STRING (pas ENUM) - Plus flexible
            if (!Schema::hasColumn('users', 'role')) {
                $table->string('role', 50)->nullable()->after('prenom');
            }
            
            if (!Schema::hasColumn('users', 'site')) {
                $table->string('site', 100)->nullable()->after('role');
            }
            
            if (!Schema::hasColumn('users', 'remote_user_id')) {
                $table->string('remote_user_id')->nullable()->after('site');
            }
            
            // Données étendues
            if (!Schema::hasColumn('users', 'metier_info')) {
                $table->json('metier_info')->nullable()->after('remote_user_id');
            }
            
            // État et synchronisation
            if (!Schema::hasColumn('users', 'actif')) {
                $table->boolean('actif')->default(true)->after('metier_info');
            }
            
            if (!Schema::hasColumn('users', 'last_sync_at')) {
                $table->timestamp('last_sync_at')->nullable()->after('actif');
            }
        });

        // SUPPRIMER les colonnes non utilisées
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'name')) {
                $table->dropColumn('name');
            }
            if (Schema::hasColumn('users', 'password')) {
                $table->dropColumn('password');
            }
            if (Schema::hasColumn('users', 'email_verified_at')) {
                $table->dropColumn('email_verified_at');
            }
        });

        // AJOUTER les index pour les performances
        // ✅ Utiliser try/catch pour éviter les erreurs si l'index existe déjà
        try {
            Schema::table('users', function (Blueprint $table) {
                $table->index('role', 'users_role_index');
                $table->index(['actif', 'role'], 'users_actif_role_index');
                $table->index('login', 'users_login_index');
                $table->index('remote_user_id', 'users_remote_user_id_index');
            });
        } catch (\Exception $e) {
            // Index déjà existant, ignorer l'erreur
            echo "Note: Certains index existent déjà\n";
        }
    }

    /**
     * Rollback de la migration
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Supprimer les index (ignorer les erreurs si non existants)
            try {
                $table->dropIndex('users_role_index');
            } catch (\Exception $e) {}
            
            try {
                $table->dropIndex('users_actif_role_index');
            } catch (\Exception $e) {}
            
            try {
                $table->dropIndex('users_login_index');
            } catch (\Exception $e) {}
            
            try {
                $table->dropIndex('users_remote_user_id_index');
            } catch (\Exception $e) {}
        });

        Schema::table('users', function (Blueprint $table) {
            // Remettre les colonnes Laravel standard
            $table->string('name')->after('id');
            $table->string('password')->after('email');
            $table->timestamp('email_verified_at')->nullable()->after('password');
        });

        Schema::table('users', function (Blueprint $table) {
            // Supprimer les colonnes Security-Base
            $table->dropColumn([
                'login',
                'nom',
                'prenom',
                'role',
                'site',
                'remote_user_id',
                'metier_info',
                'actif',
                'last_sync_at'
            ]);
        });
    }
};