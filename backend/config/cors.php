<?php

return [

    /*
    |--------------------------------------------------------------------------
    | CORS Paths
    |--------------------------------------------------------------------------
    |
    | You can enable CORS for 1 or multiple paths.
    | Example: [\'api/*\', \'sanctum/csrf-cookie\']
    */

    'paths' => ['api/*', 'login', 'logout', 'sanctum/csrf-cookie'],

    /*
    |--------------------------------------------------------------------------
    | Allowed Methods
    |--------------------------------------------------------------------------
    |
    | 
* allows all methods.
    */

    'allowed_methods' => ['*'],

    /*
    |--------------------------------------------------------------------------
    | Allowed Origins
    |--------------------------------------------------------------------------
    |
    | You can allow specific origins, 
*
 allows all origins.
    | Example: [\'http://localhost:4200\']
    */

    'allowed_origins' => ['http://localhost:4200', 'https://devobcom.urssaf.recouv'],

    /*
    |--------------------------------------------------------------------------
    | Allowed Origins Patterns
    |--------------------------------------------------------------------------
    |
    | You can use patterns to allow origins.
    | Example: [\'http://localhost:*\']
    */

    'allowed_origins_patterns' => [],

    /*
    |--------------------------------------------------------------------------
    | Allowed Headers
    |--------------------------------------------------------------------------
    |
    | 
*
 allows all headers.
    */

    'allowed_headers' => ['*'],

    /*
    |--------------------------------------------------------------------------
    | Exposed Headers
    |--------------------------------------------------------------------------
    |
    | Allows headers to be exposed to the browser.
    */

    'exposed_headers' => ['Authorization'],

    /*
    |--------------------------------------------------------------------------
    | Max Age
    |--------------------------------------------------------------------------
    |
    | Specifies how long the results of a preflight request can be cached.
    */

    'max_age' => 3600,

    /*
    |--------------------------------------------------------------------------
    | Supports Credentials
    |--------------------------------------------------------------------------
    |
    | A boolean that indicates whether or not the actual request can be made using credentials.
    */

    'supports_credentials' => true,

];
