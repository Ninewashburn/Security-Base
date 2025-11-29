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
        Schema::create('incidents', function (Blueprint $table) {
            $table->id();

            // Champs principaux
            $table->string('object');
            $table->json('domains')->nullable();
            $table->string('gravity'); // faible, moyenne, forte, très grave
            $table->string('status')->default('en_cours'); // en_cours, cloture, archive
            $table->string('previousStatus')->nullable(); // Stocke le statut précédent avant archivage

            // Dates
            $table->timestamp('dateOuverture')->useCurrent();
            $table->timestamp('dateCloture')->nullable();

            // Sites et portée
            $table->boolean('isNational')->default(false);

            // Tickets
            $table->string('ticketNumber')->nullable();
            $table->string('lienTicketHelpy')->nullable();

            // Personnes (remplacé par des clés étrangères)
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('assigned_to')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('validateur_id')->nullable()->constrained('users')->onDelete('set null');

            // Météo et impacts
            $table->boolean('meteo')->default(false);
            $table->json('publicsImpactes')->nullable();
            $table->json('sitesImpactes')->nullable();

            // Descriptions
            $table->text('description')->nullable();
            $table->text('actionsMenees')->nullable();
            $table->text('actionsAMener')->nullable();
            $table->text('tempsIndisponibilite')->nullable();

            // Validation workflow
            $table->string('statut_validation')->nullable();
            $table->timestamp('date_validation')->nullable();
            $table->json('template_actions')->nullable();

            // Archivage (nouveau depuis votre Angular)
            $table->boolean('archived')->default(false);
            $table->timestamp('archived_at')->nullable();
            $table->string('archived_by')->nullable();
            $table->text('archiveReason')->nullable();

            // Mail
            $table->text('mailAlerte')->nullable();

            $table->timestamps();

            // Index pour SQLite
            $table->index(['status', 'gravity']);
            $table->index('dateOuverture');
            $table->index('archived');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('incidents');
    }
};
