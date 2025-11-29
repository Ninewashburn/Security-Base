<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Incident;
use Carbon\Carbon;

// Nettoyage soft-deletes +3 mois
class PruneArchivedIncidents extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:prune-archived-incidents';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Permanently deletes incidents that have been soft-deleted for more than 3 months.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $threshold = Carbon::now()->subMonths(3);

        $incidentsToPrune = Incident::onlyTrashed()
            ->where('deleted_at', '<=', $threshold)
            ->get();

        $count = $incidentsToPrune->count();

        if ($count > 0) {
            foreach ($incidentsToPrune as $incident) {
                $incident->forceDelete();
            }
            $this->info("{$count} archived incidents pruned successfully.");
        } else {
            $this->info('No archived incidents to prune.');
        }
    }
}
