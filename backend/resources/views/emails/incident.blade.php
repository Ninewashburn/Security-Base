<!DOCTYPE html>
<!-- resources/views/emails/incident.blade.php -->
<html>
<head>
    <meta charset="utf-8">
    <title>Incident Sécurité</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.5; color: #333; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; text-align: center; }
        .content { background: white; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
        .info_table { width: 100%; margin-bottom: 20px; }
        .info_table td { padding: 8px; border-bottom: 1px solid #eee; }
        .info_table td:first-child { font-weight: bold; width: 30%; }
        .gravity_badge { padding: 4px 8px; border-radius: 10px; font-size: 12px; font-weight: bold; }
        .grave { background: #f8d7da; color: #721c24; }
        .tres_grave { background: #f5c6cb; color: #491217; }
        .moyen { background: #fff3cd; color: #856404; }
        .faible { background: #d4edda; color: #155724; }
        .button { display: inline-block; padding: 12px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
        .footer { margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px; font-size: 12px; color: #6c757d; text-align: center; }
        .info_section { margin-bottom: 20px; }
        .badge_container { margin-top: 5px; }
        .badge { display: inline-block; padding: 4px 8px; border-radius: 12px; margin: 2px; font-size: 11px; font-weight: 500; }
        .urgent_info { background: #ffe6e6; border-left: 4px solid #dc3545; padding: 10px; margin: 10px 0; }
        .actions_list { background: #fff3cd; padding: 10px; border-radius: 5px; margin: 5px 0; }
        .actions_list li { margin-bottom: 3px; color: #856404; }
    </style>
</head>
<body>
    <div class="container">
        
        <!-- En-tête selon le type -->
        <div class="header">
            @if($type === 'creation')
                <h2>🚨 Nouvel Incident Sécurité</h2>
            @elseif($type === 'validation')
                <h2>⚠️ VALIDATION REQUISE</h2>
                <p style="color: #dc3545; font-weight: bold;">Cet incident {{ $gravityLabel === 'Très Grave' ? 'TRES GRAVE' : 'GRAVE' }} nécessite une validation de responsable</p>
            @elseif($type === 'validated')
                <h2>✅ Incident Validé</h2>
                <p style="color: #28a745; font-weight: bold;">Cet incident {{ $gravityLabel === 'Très Grave' ? 'TRES GRAVE' : 'GRAVE' }} a été validé et peut maintenant être traité</p>
            @elseif($type === 'cloture')
                <h2>🔒 Incident Clôturé</h2>
                <p style="color: #28a745; font-weight: bold;">Cet incident a été marqué comme clôturé</p>
            @elseif($type === 'archive')
                <h2>📦 Incident Archivé</h2>
                <p style="color: #6c757d; font-weight: bold;">Cet incident a été archivé</p>
            @elseif($type === 'unarchive')
                <h2>♻️ Incident Restauré</h2>
                <p style="color: #17a2b8; font-weight: bold;">Cet incident a été restauré et est de nouveau visible dans la liste des incidents clôturés.</p>
            @elseif($type === 'soft_delete')
                <h2>🗑️ Incident mis à la corbeille</h2>
                <p style="color: #dc3545; font-weight: bold;">Cet incident a été déplacé vers la corbeille. Il peut encore être restauré si nécessaire.</p>
            @elseif($type === 'trash_restore')
                <h2>♻️ Incident restauré</h2>
                <p style="color: #28a745; font-weight: bold;">Cet incident a été restauré depuis la corbeille et est de nouveau actif.</p>
            @elseif($type === 'force_delete')
                <h2>🚨 INCIDENT SUPPRIMÉ DÉFINITIVEMENT</h2>
                <p style="color: #dc3545; font-weight: bold; background: #ffe6e6; padding: 10px; border-radius: 5px;">⚠️ ATTENTION : Cet incident a été supprimé définitivement du système. Cette action est irréversible.</p>
            @elseif($type === 'downgraded')
                <h2>⚖️ Incident Réévalué</h2>
                <p style="color: #ffc107; font-weight: bold;">La gravité de cet incident a été rétrogradée et ne nécessite plus de validation formelle.</p>
            @endif
        </div>

        <!-- Informations incident -->
        <div class="content">
            
            <!-- Informations essentielles -->
            <table class="info_table">
                <tr>
                    <td>Objet :</td>
                    <td><strong>{{ $incident->object }}</strong></td>
                </tr>
                <tr>
                    <td>ID Incident :</td>
                    <td><strong>#{{ $incident->id }}</strong></td>
                </tr>
                <tr>
                    <td>Gravité :</td>
                    <td>
                        <span class="gravity_badge {{ $incident->gravity }}">
                            {{ $gravityLabel }}
                        </span>
                    </td>
                </tr>
                <tr>
                    <td>Statut :</td>
                    <td><strong>{{ $statusDisplay }}</strong></td>
                </tr>
                <tr>
                    <td>Type :</td>
                    <td>{{ $incident->isNational ? 'National' : 'Local' }}</td>
                </tr>
                <tr>
                    <td>Rédacteur :</td>
                    <td>{{ $creatorName }}</td>
                </tr>
                @if($incident->assignee)
                <tr>
                    <td>Intervenant :</td>
                    <td><strong>{{ $assigneeName }}</strong></td>
                </tr>
                @endif
                <tr>
                    <td>Date ouverture :</td>
                    <td>{{ $incident->dateOuverture ? $incident->dateOuverture->timezone('Europe/Paris')->format('d/m/Y à H:i') : 'Non définie' }}</td>
                </tr>
                @if($incident->dateCloture)
                <tr>
                    <td>Date clôture :</td>
                    <td>{{ $incident->dateCloture->timezone('Europe/Paris')->format('d/m/Y à H:i') }}</td>
                </tr>
                @endif
                @if($incident->tempsIndisponibilite)
                <tr>
                    <td>Temps d'indisponibilité :</td>
                    <td><strong style="color: #dc3545;">{{ $incident->tempsIndisponibilite }}</strong></td>
                </tr>
                @endif
            </table>

            <!-- Description si présente -->
            @if($incident->description)
            <div style="margin-bottom: 15px;">
                <strong>Description :</strong>
                <div style="background: #f8f9fa; padding: 10px; border-left: 3px solid #007bff; margin-top: 5px;">
                    {!! nl2br(strip_tags($incident->description)) !!}
                </div>
            </div>
            @endif

            <!-- Domaines concernés -->
            @if($incident->domains && count($incident->domains) > 0)
            <div style="margin-bottom: 15px;">
                <strong>Domaines concernés :</strong>
                <div style="margin-top: 5px;">
                    @foreach($incident->domains as $domain)
                        <span style="background: #e3f2fd; padding: 4px 8px; border-radius: 12px; margin: 2px 4px; font-size: 12px; color: #1565c0; font-weight: 500; border: 1px solid #90caf9;">{{ $domain }}</span>
                    @endforeach
                </div>
            </div>
            @endif

            <!-- Publics impactés -->
            @if($incident->publicsImpactes && count($incident->publicsImpactes) > 0)
            <div style="margin-bottom: 15px;">
                <strong>Publics impactés :</strong>
                <div style="margin-top: 5px;">
                    @foreach($incident->publicsImpactes as $public)
                        <span style="background: #ffeaa7; padding: 3px 6px; border-radius: 8px; margin: 2px; font-size: 11px; color: #2d3436;">{{ $public }}</span>
                    @endforeach
                </div>
            </div>
            @endif

            <!-- Sites impactés -->
            @if($incident->sitesImpactes && count($incident->sitesImpactes) > 0)
            <div style="margin-bottom: 15px;">
                <strong>Sites impactés :</strong>
                <div style="margin-top: 5px;">
                    @foreach($incident->sitesImpactes as $site)
                        <span style="background: #fab1a0; padding: 3px 6px; border-radius: 8px; margin: 2px; font-size: 11px; color: #2d3436;">{{ $site }}</span>
                    @endforeach
                </div>
            </div>
            @endif

            <!-- Actions à mener -->
            @if($incident->actionsAMener && count($incident->actionsAMener) > 0)
            <div style="margin-bottom: 15px;">
                <strong>Actions à Mener :</strong>
                <ul class="actions_list" style="margin: 5px 0; padding-left: 20px; background: #fff3cd; padding: 10px; border-radius: 5px;">
                    @foreach($incident->actionsAMener as $action)
                        <li style="margin-bottom: 3px; color: #856404;"><strong>{{ $action }}</strong></li>
                    @endforeach
                </ul>
            </div>
            @endif

            <!-- Actions menées -->
            @if($incident->actionsMenees && count($incident->actionsMenees) > 0)
            <div style="margin-bottom: 15px;">
                <strong>Actions Menées :</strong>
                <ul style="margin: 5px 0; padding-left: 20px; background: #d4edda; padding: 10px; border-radius: 5px;">
                    @foreach($incident->actionsMenees as $action)
                        <li style="margin-bottom: 3px; color: #155724;"><strong>{{ $action }}</strong></li>
                    @endforeach
                </ul>
            </div>
            @endif

            <!-- Tickets externes -->
            @if($incident->ticketNumber || $incident->lienTicketHelpy || $incident->lienTicketTandem)
            <div style="margin-bottom: 15px; background: #e8f5e8; padding: 10px; border-radius: 5px;">
                <strong>N° Ticket : {{ $incident->ticketNumber }}</strong>
                @if($incident->lienTicketHelpy)
                <div style="margin-top: 5px;">
                    <strong>Ticket Helpy :</strong> 
                    <a href="{{ $incident->lienTicketHelpy }}" style="color: #007bff;">
                        Consulter le ticket Helpy
                    </a>
                </div>
                @endif
                @if($incident->lienTicketTandem)
                <div style="margin-top: 5px;">
                    <strong>Ticket Tandem :</strong> 
                    <a href="{{ $incident->lienTicketTandem }}" style="color: #007bff;">
                        Consulter le ticket Tandem
                    </a>
                </div>
                @endif
            </div>
            @endif

            <!-- Bouton d'action -->
            <!-- <div style="text-align: center; margin-top: 25px;">
                <a href="{{ config('app.url') }}/incident/{{ $incident->id }}" class="button">
                    📋 Consulter l'incident dans Security-Base
                </a>
            </div> -->

        </div>

        <!-- Footer -->
        <div class="footer">
            <p><strong>Email automatique généré par Security-Base URSSAF</strong></p>
            <p>{{ now()->timezone('Europe/Paris')->format('d/m/Y à H:i') }}</p>
            @if($type === 'validation')
            <p style="color: #dc3545; font-weight: bold;">⚠️ Action requise - Merci de traiter cet incident rapidement</p>
            @endif
        </div>
        
    </div>
</body>
</html>