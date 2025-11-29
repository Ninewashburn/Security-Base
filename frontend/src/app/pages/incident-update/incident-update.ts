// src/app/pages/incident-update/incident-update.ts
import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { Subject } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';

import { Incident, IncidentFormData } from '../../models';
import { IncidentDataService } from '../../services/incident-data/incident-data.service';
import { NotificationService } from '../../services/notification/notification.service';
import { IncidentForm } from '../../common/incident-form/incident-form';

@Component({
  selector: 'app-incident-update',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, QuillModule, IncidentForm],
  templateUrl: './incident-update.html',
  styleUrls: ['./incident-update.scss']
})
export class IncidentUpdate implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  incident: Incident | undefined;
  isLoading = true;

  @ViewChild('incidentFormRef') incidentFormRef!: IncidentForm;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private incidentDataService: IncidentDataService,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    this.loadIncident();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  currentFormProgress: number = 0;

  // Méthode appelée par l'enfant incident-form
  onProgressChanged(progress: number): void {
    this.currentFormProgress = progress;
  }

  // ===== CHARGEMENT DES DONNÉES =====

  private loadIncident(): void {
    this.route.paramMap.pipe(
      takeUntil(this.destroy$),
      switchMap(params => {
        const id = Number(params.get('id'));

        if (isNaN(id)) {
          this.handleIncidentNotFound();
          return [];
        }

        this.isLoading = true;
        return this.incidentDataService.getIncidentById(id);
      })
    ).subscribe({
      next: (incident) => {
        if (incident) {
          this.incident = incident;
          this.isLoading = false;
        } else {
          this.handleIncidentNotFound();
        }
      },
      error: (error: any) => {
        console.error('❌ incident-update - Erreur chargement:', error);
        this.handleIncidentNotFound();
        this.notificationService.error('Erreur de chargement', `Impossible de charger l'incident. Détails: ${error.message || error}`);
      }
    });
  }

  private handleIncidentNotFound(): void {
    this.isLoading = false;
    this.incident = undefined;
    this.notificationService.error(
      'Incident non trouvé',
      'L\'incident que vous essayez de modifier n\'existe pas.'
    );
  }

  get hasUnsavedChanges(): boolean {
    return this.incidentFormRef?.hasUnsavedChanges ?? false;
  }

  // ===== GESTION DES ÉVÉNEMENTS DU FORMULAIRE =====

  onSave(formData: IncidentFormData): void {
    if (!this.incident) {
      this.notificationService.error('Erreur', 'Aucun incident à modifier.');
      return;
    }

    this.incidentDataService.updateIncident(this.incident.id, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedIncident) => this.handleUpdateSuccess(updatedIncident),
        error: (error) => this.handleUpdateError(error)
      });
  }

  onCancel(): void {
    this.quickReturn();
  }

  // ===== GESTION DES RÉSULTATS =====

  private handleUpdateSuccess(incident: Incident): void {
    // Réinitialiser l'état de soumission du formulaire
    this.incidentFormRef?.resetSubmittingState();

    this.notificationService.success(
      'Incident mis à jour',
      `L'incident #${incident.id} a été modifié avec succès.`
    );

    this.router.navigate(['/incidents']);
  }

  private handleUpdateError(error: any): void {
    // Réinitialiser l'état de soumission même en cas d'erreur
    this.incidentFormRef?.resetSubmittingState();

    this.notificationService.error(
      'Erreur de mise à jour',
      `Impossible de modifier l'incident. Veuillez réessayer. Détails: ${error.message || error}`
    );
  }

  // ===== NAVIGATION =====

  async quickReturn(): Promise<void> {
    const hasChanges = this.hasUnsavedChanges;

    if (hasChanges && !confirm('Quitter sans sauvegarder les modifications ?')) {
      return;
    }

    await this.router.navigate(['/incidents']);
  }
}