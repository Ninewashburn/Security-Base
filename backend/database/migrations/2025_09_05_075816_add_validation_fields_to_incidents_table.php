<?php
// database/migrations/xxxx_add_validation_fields_to_incidents_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('incidents', function (Blueprint $table) {
            $table->boolean('validated')->default(false)->after('status');
            $table->timestamp('validated_at')->nullable()->after('validated');
            $table->unsignedBigInteger('validated_by')->nullable()->after('validated_at');
        });
    }

    public function down()
    {
        Schema::table('incidents', function (Blueprint $table) {
            $table->dropColumn(['validated', 'validated_at', 'validated_by']);
        });
    }
};