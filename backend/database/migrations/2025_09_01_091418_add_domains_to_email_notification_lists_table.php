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
        Schema::table('email_notification_lists', function (Blueprint $table) {
            $table->json('domains')->nullable()->after('gravite');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('email_notification_lists', function (Blueprint $table) {
            $table->dropColumn('domains');
        });
    }
};
