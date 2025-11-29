<?php

use Illuminate\Database\Migrations\Migration;
use App\Models\User;

return new class extends Migration
{
    public function up(): void
    {
        // Supprimer l'ancien "Super Admin"
        User::where('nom', 'Super Admin')
            ->orWhere('prenom', 'Super Admin')
            ->orWhere('id', 1)
            ->delete();
    }

    public function down(): void
    {
        // Pas de rollback
    }
};