// src/app/pages/incident-create/incident-create.ts
import { Component, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Incident, IncidentFormData } from '../../models';
import { IncidentDataService } from '../../services/incident-data/incident-data.service';
import { NotificationService } from '../../services/notification/notification.service';
import { IncidentForm } from '../../common/incident-form/incident-form';

@Component({
  selector: 'app-incident-create',
  standalone: true,
  imports: [CommonModule, IncidentForm],
  templateUrl: './incident-create.html',
  styleUrl: './incident-create.scss'
})
export class IncidentCreate implements OnDestroy {
  private destroy$ = new Subject<void>();

  @ViewChild('incidentFormRef') incidentFormRef!: IncidentForm;

  onIncidentFormInitialized(): void {
    this.checkForIncompleteIncident();
  }

  private checkForIncompleteIncident(): void {
    const savedData = localStorage.getItem('incompleteIncident');

    if (savedData) {
      if (confirm("Une saisie non sauvegardée a été trouvée. Voulez-vous la restaurer ?")) {
        const formData = JSON.parse(savedData);
        // patchValue restaure les champs simples, mais pas le contenu des FormArray
        this.incidentFormRef.incidentForm.patchValue(formData);
        // On appelle une méthode dédiée pour restaurer les FormArray
        this.incidentFormRef.restoreFormArraysFromData(formData);
      } else {
        // Si l'utilisateur refuse, on supprime la sauvegarde
        localStorage.removeItem('incompleteIncident');
      }
    }
  }

  constructor(
    private router: Router,
    private incidentDataService: IncidentDataService,
    private notificationService: NotificationService
  ) { }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get hasUnsavedChanges(): boolean {
    return this.incidentFormRef?.hasUnsavedChanges ?? false;
  }

  // ===== GESTION DES ÉVÉNEMENTS DU FORMULAIRE =====

  onSave(formData: IncidentFormData): void {
    this.createIncident(formData);
  }

  onCancel(): void {
    this.quickReturn();
  }

  // ===== LOGIQUE MÉTIER =====

  private createIncident(formData: IncidentFormData): void {
    this.incidentDataService.createIncident(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (incident) => this.handleCreateSuccess(incident),
        error: (error: any) => this.handleCreateError(error)
      });
  }

  private handleCreateSuccess(incident: Incident): void {
    if (!incident) {
      console.error('Incident object is null or undefined in handleCreateSuccess.');
      this.notificationService.error(
        'Erreur de création',
        'L\'incident n\'a pas pu être créé car les données retournées sont invalides.'
      );
      return;
    }

    // Réinitialiser l'état de soumission du formulaire
    this.incidentFormRef?.resetSubmittingState();

    // Nettoyer la sauvegarde locale
    localStorage.removeItem('incompleteIncident');

    this.notificationService.success(
      'Incident créé avec succès',
      `L'incident #${incident.id} "${incident.object}" a été créé`
    );

    this.router.navigate(['/incidents']);
  }

  private handleCreateError(error: any): void {
    // Réinitialiser l'état de soumission même en cas d'erreur
    this.incidentFormRef?.resetSubmittingState();

    this.notificationService.error(
      'Erreur de création',
      `Impossible de créer l'incident. Veuillez réessayer. Détails: ${error.message || error}`
    );
  }

  // ===== NAVIGATION =====

  async quickReturn(): Promise<void> {
    const hasChanges = this.hasUnsavedChanges;

    if (hasChanges && !confirm('Quitter sans sauvegarder ?')) {
      return;
    }

    await this.router.navigate(['/incidents']);
  }
}