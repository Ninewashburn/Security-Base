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
        Schema::rename('email_notification_lists', 'diffusion_lists');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::rename('diffusion_lists', 'email_notification_lists');
    }
};