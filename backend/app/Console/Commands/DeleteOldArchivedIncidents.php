<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Incident; // Import the Incident model
use Carbon\Carbon; // Import Carbon for date manipulation

class DeleteOldArchivedIncidents extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:delete-old-archived-incidents';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Delete incidents that have been archived for more than 36 months.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting deletion of old archived incidents...');

        $thresholdDate = Carbon::now()->subMonths(36);

        $deletedCount = Incident::where('status', 'archive')
                                ->where('archived', 1)
                                ->where('archived_at', '<', $thresholdDate)
                                ->forceDelete(); // Use forceDelete for permanent deletion

        $this->info("{$deletedCount} old archived incidents deleted successfully.");
    }
}
