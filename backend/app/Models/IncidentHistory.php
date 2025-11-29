<?php
//app/Models/IncidentHistory.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IncidentHistory extends Model
{
    const UPDATED_AT = null; // Pas de updated_at nécessaire
    
    protected $fillable = [
        'incident_id',
        'action',
        'user_id',
        'snapshot',
        'changes',
        'reason'
    ];

    protected $casts = [
        'snapshot' => 'array',
        'changes' => 'array',
        'created_at' => 'datetime'
    ];

    public function incident(): BelongsTo
    {
        return $this->belongsTo(Incident::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}