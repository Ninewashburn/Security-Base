<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('incidents', function (Blueprint $table) {
            $table->unsignedBigInteger('template_id')->nullable()->after('status');
            $table->foreign('template_id')->references('id')->on('incident_templates')->onDelete('set null');
        });
    }

    public function down()
    {
        Schema::table('incidents', function (Blueprint $table) {
            $table->dropForeign(['template_id']);
            $table->dropColumn('template_id');
        });
    }
};