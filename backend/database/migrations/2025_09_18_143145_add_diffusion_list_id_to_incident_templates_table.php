<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('incident_templates', function (Blueprint $table) {
            // Vérifier si la colonne n'existe pas déjà
            if (!Schema::hasColumn('incident_templates', 'diffusion_list_id')) {
                $table->unsignedBigInteger('diffusion_list_id')->nullable()->after('description');
                $table->foreign('diffusion_list_id')->references('id')->on('diffusion_lists')->onDelete('set null');
            }
        });
    }

    public function down(): void
    {
        Schema::table('incident_templates', function (Blueprint $table) {
            if (Schema::hasColumn('incident_templates', 'diffusion_list_id')) {
                $table->dropForeign(['diffusion_list_id']);
                $table->dropColumn('diffusion_list_id');
            }
        });
    }
};