<?php
// database/migrations/2025_01_15_XXXXXX_create_roles_table_clean.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Supprimer la table si elle existe (sans contraintes)
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('roles');
        Schema::enableForeignKeyConstraints();

        // Créer la table proprement
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('label', 100);
            $table->text('description')->nullable();
            $table->json('permissions');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            // Index pour optimiser les recherches
            $table->index('code');
            $table->index('is_active');
        });

        echo "✅ Table 'roles' créée avec succès\n";
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('roles');
        Schema::enableForeignKeyConstraints();
    }
};