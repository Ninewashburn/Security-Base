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
        Schema::create('action_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->json('trigger_keywords');
            $table->json('actions_checklist');
            $table->json('services_concernes')->nullable();
            $table->integer('priority')->default(10);
            $table->boolean('actif')->default(true);
            $table->text('description')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->foreignId('updated_by')->nullable()->constrained('users');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('action_templates');
    }
};