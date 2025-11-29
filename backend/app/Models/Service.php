<?php
// app/Models/Service.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Service extends Model
{
    use HasFactory;

    protected $fillable = ['name'];

    // Si vous avez des relations ou des accesseurs spécifiques aux services, ils iraient ici.
}