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
        Schema::table('diffusion_lists', function (Blueprint $table) {
            // Ajouter la colonne sites pour stocker les sites sélectionnés en JSON
            $table->json('sites')->nullable()->after('domains');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('diffusion_lists', function (Blueprint $table) {
            $table->dropColumn('sites');
        });
    }
};