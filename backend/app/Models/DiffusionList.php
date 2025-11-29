<?php
// app/Models/DiffusionList.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DiffusionList extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'type',
        'gravite',
        'domains',
        'sites',
        'service_id',
        'emails',
        'description',
        'actif',
        'auto_include_service_users',
        'created_by',
        'updated_by'
    ];

    protected $casts = [
        'emails' => 'array',
        'domains' => 'array',
        'sites' => 'array',
        'actif' => 'boolean',
        'auto_include_service_users' => 'boolean'
    ];

    /**
     * Configuration par défaut avec domaines
     */
    public static function getDefaultLists(): array
    {
        $domains = array_values(self::getAvailableDomains());
        return [
            [
                'name' => 'Incidents Très Graves - Direction & COSSI',
                'type' => 'metier',
                'gravite' => 'tres_grave',
                'domains' => [$domains[0], $domains[2]], // Production, Sécurité, Mails fictifs
                'emails' => ['direction-test@urssaf.fr', 'cossi-test@urssaf.fr'],
                'description' => 'Liste pour les alertes majeures touchant la production ou la sécurité SI.',
                'actif' => true,
                'auto_include_service_users' => true
            ],
            [
                'name' => 'Incidents Graves - Responsables Métier',
                'type' => 'metier',
                'gravite' => 'grave',
                'domains' => [],
                'emails' => ['responsables.metier-test@urssaf.fr'],
                'description' => 'Liste pour les incidents graves nécessitant une attention des responsables.',
                'actif' => true,
                'auto_include_service_users' => true
            ],
            [
                'name' => 'Incidents Moyens - Equipes Techniques',
                'type' => 'metier',
                'gravite' => 'moyen',
                'domains' => $domains,
                'emails' => ['equipes.techniques-test@urssaf.fr'],
                'description' => 'Liste générale pour les équipes techniques sur tous les domaines.',
                'actif' => true,
                'auto_include_service_users' => false
            ]
        ];
    }

    /**
     * Relations
     */
    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * RÉCUPÉRATION DES EMAILS FINAUX
     */
    public function getFinalEmailsAttribute(): array
    {
        $emails = $this->emails ?? [];

        // Ajouter automatiquement les emails des utilisateurs du service
        if ($this->auto_include_service_users) {
            $serviceEmails = $this->getServiceEmails();
            $emails = array_merge($emails, $serviceEmails);
        }

        return array_unique(array_filter($emails));
    }

    /**
     * EMAILS DU SERVICE CONCERNÉ
     */
    private function getServiceEmails(): array
    {
        $query = User::where('actif', true)->whereNotNull('email');

        // Si service spécifique
        if ($this->service_id) {
            $query->where('service_id', $this->service_id);
        } else {
            // Selon la gravité, inclure différents services/rôles
            switch ($this->gravite) {
                case 'tres_grave':
                    // Tous les responsables + direction
                    $query->whereIn('role', ['responsable', 'admin']);
                    break;
                    
                case 'grave':
                    // Responsables seulement
                    $query->where('role', 'responsable');
                    break;
                    
                case 'moyen':
                    // Services techniques selon domaines
                    if (in_array('production', $this->domains ?? [])) {
                        $query->where('service', 'informatique');
                    }
                    if (in_array('sécurité SI', $this->domains ?? [])) {
                        $query->where('service', 'securite');
                    }
                    break;
            }
        }

        return $query->pluck('email')->toArray();
    }

    /**
     * VALIDATION DES EMAILS ET DOMAINES
     */
    public function validateData(): array
    {
        $errors = [];
        $emails = $this->emails ?? [];

        // Validation emails
        foreach ($emails as $email) {
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $errors[] = "Email invalide: {$email}";
            }
        }

        // Validation domaines avec logs de débogage
        \Log::info('--- Début Validation Domaines ---');
        $validDomains = array_values(self::getAvailableDomains());
        \Log::info('Domaines valides attendus:', $validDomains);
        \Log::info('Domaines reçus à valider:', $this->domains ?? ['Aucun domaine reçu']);

        foreach ($this->domains ?? [] as $domain) {
            $isDomainValid = in_array($domain, $validDomains);
            \Log::info("Validation du domaine: '{$domain}'", [
                'est_valide' => $isDomainValid
            ]);
            if (!$isDomainValid) {
                $errors[] = "Domaine invalide: {$domain}";
            }
        }
        \Log::info('--- Fin Validation Domaines ---', ['erreurs' => $errors]);

        return $errors;
    }

    /**
     * SCOPES
     */
    public function scopeActive($query)
    {
        return $query->where('actif', true);
    }

    public function scopeByGravity($query, string $gravite)
    {
        return $query->where('gravite', $gravite);
    }

    public function scopeByDomain($query, string $domain)
    {
        return $query->whereJsonContains('domains', $domain);
    }

    public function scopeByService($query, ?int $serviceId)
    {
        if ($serviceId) {
            return $query->where('service_id', $serviceId);
        }
        return $query->whereNull('service_id');
    }

    /**
     * MÉTHODES STATIQUES UTILITAIRES
     */
    public static function seedDefaultLists(): void
    {
        foreach (static::getDefaultLists() as $listData) {
            static::firstOrCreate(
                [
                    'name' => $listData['name'],
                    'gravite' => $listData['gravite']
                ],
                $listData
            );
        }
    }

    public static function getAvailableGravities(): array
    {
        return [
            'faible' => 'Faible',
            'moyen' => 'Moyen', 
            'grave' => 'Grave',
            'tres_grave' => 'Très grave',
        ];
    }

    public static function getAvailableDomains(): array
    {
        return [
            'Production' => 'Production',
            'Biens & personnes' => 'Biens & personnes',
            'Sécurité du système d\'information' => 'Sécurité du système d\'information'
        ];
    }

    // Sites disponibles
    public static function getAvailableSites(): array
    {
        return [
            // Sites Nationaux
            'PAJEMPLOI' => 'Centre PAJEMPLOI',
            'CNV' => 'CNV',
            
            // Région Auvergne
            'Clermont-Fd' => 'Clermont-Ferrand',
            'Le-Puy' => 'Le Puy',
            'Aurillac' => 'Aurillac',
            'Moulins' => 'Moulins'
        ];
    }

    /**
     * TEST D'UNE LISTE
     */
    public function testEmailList(Incident $incident): array
    {
        $finalEmails = $this->final_emails;
        
        return [
            'list_id' => $this->id,
            'list_name' => $this->name,
            'gravite' => $this->gravite,
            'domains' => $this->domains,
            'emails_count' => count($finalEmails),
            'static_emails' => $this->emails ?? [],
            'dynamic_emails' => array_diff($finalEmails, $this->emails ?? []),
            'final_emails' => $finalEmails,
            'incident_id' => $incident->id,
            'test_timestamp' => now()
        ];
    }
}