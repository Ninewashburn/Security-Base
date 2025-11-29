// src/app/pages/modals/trash-modal/trash-modal.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit, Input, Output, EventEmitter, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Incident } from '../../../models/incident.model';
import { IncidentDataService } from '../../../services/incident-data/incident-data.service';
import { NotificationService } from '../../../services/notification/notification.service';
import { IncidentDisplayService } from '../../../services/incident-display/incident-display.service';
import { PermissionService } from '../../../services/permissions/permission.service';

@Component({
  selector: 'app-trash-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trash-modal.html',
  styleUrls: ['./trash-modal.scss']
})
export class TrashModal implements OnInit, OnDestroy, OnChanges {

  // ===== INPUTS/OUTPUTS =====
  @Input() isVisible = false;
  @Output() close = new EventEmitter<void>();

  // ===== PROPRIÉTÉS PUBLIQUES =====
  trashedIncidents: Incident[] = [];
  isLoading = false;
  statusConfig: any;

  // ===== PROPRIÉTÉS PRIVÉES =====
  private readonly destroy$ = new Subject<void>();

  // ===== CONSTRUCTOR =====
  constructor(
    private incidentDataService: IncidentDataService,
    private notificationService: NotificationService,
    public incidentDisplayService: IncidentDisplayService,
    public PermissionService: PermissionService
  ) {
    this.statusConfig = this.incidentDisplayService.statusConfig;
  }

  // ===== LIFECYCLE HOOKS =====
  ngOnInit(): void {
    // Initialisation si nécessaire, mais pas de chargement automatique
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Ne charger que si la modal devient visible ET qu'elle était fermée avant
    if (changes['isVisible'] &&
      changes['isVisible'].currentValue === true &&
      changes['isVisible'].previousValue === false) {
      this.loadTrashedIncidents();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===== MÉTHODES PUBLIQUES - GESTION DES INCIDENTS =====
  restoreIncident(incident: Incident): void {
    this.incidentDataService.restoreTrashedIncident(incident.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Supprimer de la liste locale après restauration réussie
          this.trashedIncidents = this.trashedIncidents.filter(i => i.id !== incident.id);

          this.notificationService.success(
            'Incident restauré',
            `L'incident #${incident.id} "${incident.object}" a été restauré avec succès.`
          );
        },
        error: (error) => {
          console.error('Erreur lors de la restauration:', error);
          this.notificationService.error(
            'Erreur de restauration',
            `L'incident #${incident.id} n'a pas pu être restauré. ${error.message || error}`
          );
        }
      });
  }

  forceDeleteIncident(incident: Incident): void {
    const confirmMessage = `Êtes-vous sûr de vouloir supprimer DÉFINITIVEMENT l'incident #${incident.id} ?\n\nObjet: ${incident.object}\n\nCette action est IRRÉVERSIBLE.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    // Utiliser la nouvelle méthode dédiée pour la suppression depuis la corbeille
    this.incidentDataService.deleteTrashedIncident(incident.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Supprimer de la liste locale après suppression réussie
          this.trashedIncidents = this.trashedIncidents.filter(i => i.id !== incident.id);

          this.notificationService.success(
            'Suppression définitive',
            `L'incident #${incident.id} "${incident.object}" a été supprimé définitivement.`
          );
        },
        error: (error) => {
          console.error('Erreur lors de la suppression définitive:', error);
          this.notificationService.error(
            'Erreur de suppression',
            `L'incident #${incident.id} n'a pas pu être supprimé définitivement. ${error.message || error}`
          );
        }
      });
  }

  // ===== MÉTHODES PUBLIQUES - ACTIONS =====
  closeModal(): void {
    this.close.emit();
  }

  // ===== MÉTHODES PUBLIQUES - TRACKING =====
  trackByIncidentId(_: number, incident: Incident): number {
    return incident.id;
  }

  // ===== MÉTHODES PRIVÉES =====
  private loadTrashedIncidents(): void {
    this.isLoading = true;

    this.incidentDataService.getTrashedIncidents()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (incidents) => {
          this.trashedIncidents = incidents;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement de la corbeille:', error);
          this.notificationService.error(
            'Erreur de chargement',
            'Impossible de charger les incidents de la corbeille.'
          );
          this.isLoading = false;
        }
      });
  }
}