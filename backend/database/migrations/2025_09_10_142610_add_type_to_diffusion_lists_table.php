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
            // Le type doit être explicitement défini
            $table->enum('type', ['metier', 'personnelle', 'validator'])->after('name');
           
            // Rendre la gravité nullable pour les listes personnelles
            $table->string('gravite')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('diffusion_lists', function (Blueprint $table) {
            $table->dropColumn('type');
           
            // Remettre gravité non-nullable (si besoin)
            $table->string('gravite')->nullable(false)->change();
        });
    }
};