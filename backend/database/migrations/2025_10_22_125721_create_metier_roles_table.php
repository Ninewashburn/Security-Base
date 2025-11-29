<?php

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
        Schema::create('metier_roles', function (Blueprint $table) {
            $table->id();
            
            // Numéro du métier (clé primaire de l'API externe)
            $table->integer('num_metier')->unique();
            
            // ID du rôle dans la table roles
            $table->foreignId('role_id')
                  ->nullable()  // Peut être NULL si on veut retirer un rôle
                  ->constrained('roles')
                  ->onDelete('set null');  // Si le rôle est supprimé, mettre NULL
            
            $table->timestamps();
            
            // Index pour les recherches rapides
            $table->index('num_metier');
            $table->index('role_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('metier_roles');
    }
};