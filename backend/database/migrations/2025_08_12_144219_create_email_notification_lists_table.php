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
        Schema::create('email_notification_lists', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('gravite');
            $table->foreignId('service_id')->nullable()->constrained('services')->onDelete('set null');
            $table->json('emails')->nullable();
            $table->text('description')->nullable();
            $table->boolean('actif')->default(true);
            $table->boolean('auto_include_service_users')->default(false);
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
        Schema::dropIfExists('email_notification_lists');
    }
};