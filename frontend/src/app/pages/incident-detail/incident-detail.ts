// src/app/pages/incident-detail/incident-detail.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { PermissionService } from '../../services/permissions/permission.service';
import { Incident, GRAVITY_CONFIG, STATUS_CONFIG } from '../../models/incident.model';
import { IncidentDataService } from '../../services/incident-data/incident-data.service';
import { IncidentExportService } from '../../services/incident-export/incident-export.service';
import { NotificationService } from '../../services/notification/notification.service';
import { ViewEncapsulation } from '@angular/core';
import { IncidentHistoryComponent } from '../incident-history/incident-history';

import { IncidentDisplayService } from '../../services/incident-display/incident-display.service';

@Component({
  selector: 'app-incident-detail',
  standalone: true,
  imports: [CommonModule, IncidentHistoryComponent],
  templateUrl: './incident-detail.html',
  styleUrl: './incident-detail.scss',
  encapsulation: ViewEncapsulation.None
})
export class IncidentDetail implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  incident?: Incident;
  incidentId: number = 0;
  isLoading: boolean = true;
  activeTab: 'details' | 'history' = 'details';

  // Configurations statiques
  readonly gravityConfig = GRAVITY_CONFIG;
  readonly statusConfig = STATUS_CONFIG;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private incidentDataService: IncidentDataService,
    private exportService: IncidentExportService,
    private notificationService: NotificationService,
    private sanitizer: DomSanitizer,
    public permissionService: PermissionService,
    public incidentDisplayService: IncidentDisplayService
  ) { }

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.incidentId = +params['id'];
      this.loadIncident();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===== GESTION DES DONNÉES =====

  private loadIncident(): void {
    this.isLoading = true;

    this.incidentDataService.getIncidentById(this.incidentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (incident) => {
          this.incident = incident;
          this.isLoading = false;
        },
        error: (err) => {
          this.notificationService.error(
            'Erreur de chargement',
            `Impossible de charger l'incident avec l'ID ${this.incidentId}.`
          );
          console.error('Erreur lors du chargement de l\'incident', err);
          this.isLoading = false;
          this.router.navigate(['/incidents']);
        }
      });
  }

  // ===== NAVIGATION =====

  goList(): void {
    this.router.navigate(['/incidents']);
  }

  editIncident(): void {
    if (this.incident) {
      this.router.navigate(['/incident', this.incident.id, 'update']);
    }
  }

  // ===== EXPORT =====

  exportToPDF(): void {
    if (this.incident) {
      this.exportService.exportIncidentToPDF(this.incident);
    }
  }

  // ===== VALIDATION =====

  /**
   * Vérifie si l'incident actuel nécessite une validation.
   */
  needsValidation(): boolean {
    if (!this.incident) {
      return false;
    }
    return ['grave', 'tres_grave'].includes(this.incident.gravity) &&
      this.incident.status === 'en_attente';
  }

  /**
   * Appelle le service pour valider l'incident.
   */
  validateIncident(): void {
    if (!this.incident) return;

    const message = `Valider l'incident \"${this.incident.object}\" ?\n\nCela changera son statut vers \"En cours\".`;

    if (!confirm(message)) {
      return;
    }

    this.isLoading = true; // Pour montrer un feedback visuel

    this.incidentDataService.validateIncident(this.incident.id).subscribe({
      next: () => {
        this.notificationService.success(
          'Validation réussie',
          `Incident #${this.incident?.id} validé. Statut changé vers \"En cours\".`
        );
        this.loadIncident(); // Recharger les données pour voir le nouveau statut
      },
      error: (error) => {
        this.notificationService.error(
          'Erreur de validation',
          `Impossible de valider l'incident: ${error.message || error}`
        );
        this.isLoading = false;
      }
    });
  }

  // ===== FORMATAGE POUR AFFICHAGE =====

  getDomainsDisplay(): string {
    return this.incident?.domains?.join(', ') || 'Aucun domaine';
  }

  getPublicsDisplay(): string {
    return this.incident?.publicsImpactes?.join(', ') || 'Aucun public';
  }

  getSitesDisplay(): string {
    return this.incident?.sitesImpactes?.join(', ') || 'Aucun site impacté';
  }

  getNationalDisplay(): string {
    return this.incident?.isNational ? 'Oui' : '';
  }

  getMeteoDisplay(): string {
    if (this.incident?.meteo === undefined) return 'Non renseigné';
    return this.incident.meteo ? 'Oui' : 'Non';
  }

  /**
   * Méthode pour bypasser la sanitisation Angular
   */
  getTrustedHtml(content: string | undefined): SafeHtml {
    if (!content) return '';
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }

  /*
  * Méthode pour changer d'onglet
  **/
  setActiveTab(tab: 'details' | 'history'): void {
    this.activeTab = tab;
  }

  // ===== MÉTHODES SPÉCIFIQUES =====

  getDescriptionHtml(): SafeHtml {
    return this.getTrustedHtml(this.incident?.description);
  }

  getActionsMeneesHtml(): SafeHtml {
    const actions = this.incident?.actionsMenees;
    if (!actions || actions.length === 0) return '';
    const listItems = actions.map((action: string) => `<li>${action}</li>`).join('');
    return this.getTrustedHtml(`<ul>${listItems}</ul>`);
  }

  getActionsAMenerHtml(): SafeHtml {
    const actions = this.incident?.actionsAMener;
    if (!actions || actions.length === 0) return '';
    const listItems = actions.map((action: string) => `<li>${action}</li>`).join('');
    return this.getTrustedHtml(`<ul>${listItems}</ul>`);
  }

  getTempsIndisponibiliteHtml(): SafeHtml {
    return this.getTrustedHtml(this.incident?.tempsIndisponibilite);
  }

  getMailAlerteHtml() {
    const mailAlerte = this.incident?.mailAlerte;

    if (Array.isArray(mailAlerte)) {
      return this.getTrustedHtml(mailAlerte.join('; '));
    }

    // Si ce n'est pas un tableau (ancien format ou undefined), le traiter comme une chaîne
    return this.getTrustedHtml(mailAlerte || '');
  }

  /**
   * Récupère tous les emails à afficher avec leur source (manuel/automatique)
   */
  getNotifiedEmails(): { email: string, source: 'manuel' | 'automatique' }[] {
    const result: { email: string, source: 'manuel' | 'automatique' }[] = [];

    // 1. Emails manuels (mailAlerte)
    if (this.incident?.mailAlerte && Array.isArray(this.incident.mailAlerte)) {
      this.incident.mailAlerte.forEach(email => {
        if (email && email.trim()) {
          result.push({ email: email.trim(), source: 'manuel' });
        }
      });
    }

    // 2. Emails automatiques (auto_notified_emails)
    if (this.incident?.auto_notified_emails && Array.isArray(this.incident.auto_notified_emails)) {
      this.incident.auto_notified_emails.forEach(email => {
        if (email && email.trim()) {
          result.push({ email: email.trim(), source: 'automatique' });
        }
      });
    }

    return result;
  }

  /**
   * Vérifie s'il y a des emails à afficher
   */
  hasNotifiedEmails(): boolean {
    return this.getNotifiedEmails().length > 0;
  }

  /**
    * Compte les emails automatiques (template)
    */
  getAutomaticEmailsCount(): number {
    return this.getNotifiedEmails().filter(item => item.source === 'automatique').length;
  }

  /**
   * Compte les emails manuels
   */
  getManualEmailsCount(): number {
    return this.getNotifiedEmails().filter(item => item.source === 'manuel').length;
  }

  /**
   * Récupère les emails automatiques
   */
  getAutomaticEmails() {
    return this.getNotifiedEmails().filter(item => item.source === 'automatique');
  }

  /**
 * Récupère les emails manuels
 */
  getManualEmails() {
    return this.getNotifiedEmails().filter(item => item.source === 'manuel');
  }

}