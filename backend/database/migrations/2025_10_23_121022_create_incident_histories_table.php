<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('incident_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('incident_id')->constrained()->onDelete('cascade');
            $table->string('action'); // created, updated, closed, archived, deleted, restored_archive, trashed, restored_trash
            $table->foreignId('user_id')->constrained(); // Qui a fait l'action
            $table->json('snapshot'); // État complet de l'incident à ce moment
            $table->json('changes')->nullable(); // Champs modifiés (optionnel, pour affichage différentiel)
            $table->text('reason')->nullable(); // Pourquoi cette action (optionnel)
            $table->timestamp('created_at'); // Quand
            
            // Index pour performance
            $table->index(['incident_id', 'created_at']);
            $table->index('action');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incident_histories');
    }
};