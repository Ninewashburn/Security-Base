<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // D'abord, on copie les données de date_validation vers validated_at
        // On le fait uniquement là où validated_at est nul pour ne pas écraser de données.
        DB::statement('UPDATE incidents SET validated_at = date_validation WHERE date_validation IS NOT NULL AND validated_at IS NULL');

        // Ensuite, on supprime l'ancienne colonne date_validation
        Schema::table('incidents', function (Blueprint $table) {
            $table->dropColumn('date_validation');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // On recrée la colonne si jamais on doit annuler la migration
        Schema::table('incidents', function (Blueprint $table) {
            $table->timestamp('date_validation')->nullable()->after('status');
        });
    }
};