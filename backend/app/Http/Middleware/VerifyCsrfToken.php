<?php
// app/Http/Middleware/VerifyCsrfToken.php
namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;

class VerifyCsrfToken extends Middleware
{
    /**
     * URIs exclues de la vérification CSRF
     * Le callback SSO vient d'un domaine externe et ne peut pas avoir notre token CSRF
     *
     * @var array<int, string>
     */
    protected $except = [
        'auth/sso-callback',      // Sans slash au début
        '/auth/sso-callback',     // Avec slash au début (par sécurité)
    ];
}