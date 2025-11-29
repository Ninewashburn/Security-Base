<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Migration pour ajouter les relations User à la table incidents
     */
    public function up(): void
    {
        Schema::table('incidents', function (Blueprint $table) {
            // Vérifier si les colonnes existent déjà avant de les ajouter
            if (!Schema::hasColumn('incidents', 'created_by')) {
                $table->foreignId('created_by')->nullable()->after('id')->constrained('users');
            }
            
            if (!Schema::hasColumn('incidents', 'assigned_to')) {
                $table->foreignId('assigned_to')->nullable()->after('created_by')->constrained('users');
            }
            
            if (!Schema::hasColumn('incidents', 'validateur_id')) {
                $table->foreignId('validateur_id')->nullable()->after('assigned_to')->constrained('users');
            }
            
            // Colonnes de validation
            if (!Schema::hasColumn('incidents', 'statut_validation')) {
                $table->enum('statut_validation', ['en_attente', 'valide', 'refuse'])->nullable()->after('validateur_id');
            }
            
            if (!Schema::hasColumn('incidents', 'date_validation')) {
                $table->timestamp('date_validation')->nullable()->after('statut_validation');
            }
            
            // Template actions (auto-alimentation)
            if (!Schema::hasColumn('incidents', 'template_actions')) {
                $table->json('template_actions')->nullable()->after('date_validation');
            }
        });
        
        // Ajouter les index seulement si les colonnes existent
        Schema::table('incidents', function (Blueprint $table) {
            if (Schema::hasColumn('incidents', 'created_by')) {
                $table->index('created_by');
            }
            if (Schema::hasColumn('incidents', 'assigned_to')) {
                $table->index('assigned_to');
            }
            if (Schema::hasColumn('incidents', 'validateur_id')) {
                $table->index('validateur_id');
            }
            if (Schema::hasColumn('incidents', 'statut_validation')) {
                $table->index('statut_validation');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('incidents', function (Blueprint $table) {
            // Supprimer les index
            $table->dropIndex(['created_by']);
            $table->dropIndex(['assigned_to']);
            $table->dropIndex(['validateur_id']);
            $table->dropIndex(['statut_validation']);
            
            // Supprimer les contraintes de clés étrangères
            $table->dropForeign(['created_by']);
            $table->dropForeign(['assigned_to']);
            $table->dropForeign(['validateur_id']);
            
            // Supprimer les colonnes
            $table->dropColumn([
                'created_by',
                'assigned_to',
                'validateur_id',
                'statut_validation',
                'date_validation',
                'template_actions'
            ]);
        });
    }
};