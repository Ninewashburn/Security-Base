<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('incident_templates', function (Blueprint $table) {
            $table->softDeletes(); // Ajoute deleted_at
        });
    }

    public function down(): void
    {
        Schema::table('incident_templates', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};