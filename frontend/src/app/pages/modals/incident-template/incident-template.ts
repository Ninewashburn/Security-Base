// src/app/components/incident-template-modal/incident-template-modal.ts
import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { NotificationService } from '../../../services/notification/notification.service';
import { IncidentTemplateService, IncidentTemplate } from '../../../services/incident-template/incident-template.service';
import { DiffusionListService, DiffusionListItem } from '../../../services/diffusion-list/diffusion-list.service';

@Component({
  selector: 'app-incident-template-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './incident-template.html',
  styleUrls: ['./incident-template.scss']
})
export class IncidentTemplateModal implements OnInit {
  @Output() templateSelected = new EventEmitter<{ id: number, nom_objet: string, actions: any[] }>();
  @Output() modalClosed = new EventEmitter<void>();

  isVisible = false;
  showForm = false;
  isEditing = false;
  isSubmitting = false;
  existingTemplates: IncidentTemplate[] = [];
  personalLists: DiffusionListItem[] = [];
  currentEditingId?: number;

  templateForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private templateService: IncidentTemplateService,
    private notificationService: NotificationService,
    private diffusionListService: DiffusionListService
  ) {
    this.templateForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadTemplates();
    this.loadPersonalLists();
  }

  /**
   * Validateur personnalisé pour vérifier l'unicité du nom du template.
   */
  private uniqueTemplateNameValidator(control: AbstractControl): ValidationErrors | null {
    const value = (control.value || '').trim().toLowerCase();
    if (!value) {
      return null; // Ne pas valider si le champ est vide
    }

    const isDuplicate = this.existingTemplates.some(
      template => template.nom_objet.toLowerCase() === value && template.id !== this.currentEditingId
    );

    return isDuplicate ? { nonUnique: true } : null;
  }

  /**
   * Validateur personnalisé pour s'assurer qu'au moins une action est renseignée.
   */
  private minOneActionRequired(formArray: AbstractControl): ValidationErrors | null {
    if (formArray instanceof FormArray) {
      const validActions = formArray.controls.filter(control => {
        const actionValue = control.get('action')?.value;
        return actionValue && actionValue.trim() !== '';
      });
      return validActions.length > 0 ? null : { atLeastOneActionRequired: true };
    }
    return null;
  }

  /**
   * Créer le formulaire réactif
   */
  private createForm(): FormGroup {
    return this.fb.group({
      nom_objet: ['', [Validators.required, Validators.minLength(3), this.uniqueTemplateNameValidator.bind(this)]],
      diffusion_list_id: [null],
      actions: this.fb.array([this.createActionGroup()], [this.minOneActionRequired.bind(this)])
    });
  }

  /**
   * Créer un groupe pour une action (sans validateur requis initial)
   */
  private createActionGroup(): FormGroup {
    return this.fb.group({
      action: ['']
    });
  }

  /**
   * Récupérer le FormArray des actions
   */
  getActionsFormArray(): FormArray {
    return this.templateForm.get('actions') as FormArray;
  }

  /**
   * Charger les templates existants
   */
  private loadTemplates(): void {
    this.templateService.getActiveTemplates().subscribe({
      next: (response) => {
        if (response.success) {
          this.existingTemplates = response.data;
        }
      },
      error: (error) => {
        this.notificationService.error('Erreur lors du chargement des modèles');
        console.error(error);
      }
    });
  }

  private loadPersonalLists(): void {
    this.diffusionListService.getLists('personnelle').subscribe({
      next: (response) => {
        if (response.success) {
          this.personalLists = response.data;
        }
      },
      error: (error) => {
        this.notificationService.error('Erreur lors du chargement des listes personnalisées');
        console.error(error);
      }
    });
  }

  /**
   * Ouvrir la modale
   */
  openModal(): void {
    this.isVisible = true;
    this.showForm = false;
    this.loadTemplates();
  }

  /**
   * Fermer la modale
   */
  closeModal(): void {
    this.isVisible = false;
    this.showForm = false;
    this.resetForm();
    this.modalClosed.emit();
  }

  /**
   * Clic sur l'overlay
   */
  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  /**
   * Commencer la création
   */
  startCreate(): void {
    this.isEditing = false;
    this.currentEditingId = undefined;
    this.resetForm();
    this.showForm = true;
  }

  /**
   * Commencer l'édition
   */
  startEdit(template: IncidentTemplate): void {
    this.templateService.getTemplate(template.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.isEditing = true;
          this.currentEditingId = template.id;
          this.populateForm(response.data);
          this.showForm = true;
        }
      },
      error: (error) => {
        this.notificationService.error('Erreur lors du chargement du modèle');
        console.error(error);
      }
    });
  }

  /**
   * Peupler le formulaire avec les données
   */
  private populateForm(template: IncidentTemplate): void {
    // Réinitialiser le FormArray des actions
    const actionsArray = this.getActionsFormArray();
    actionsArray.clear();

    // Ajouter les actions du template
    if (template.actions && template.actions.length > 0) {
      template.actions.forEach(action => {
        actionsArray.push(this.fb.group({
          action: [action.action]
        }));
      });
    } else {
      // Au moins une action vide
      actionsArray.push(this.createActionGroup());
    }

    // Remplir les autres champs
    this.templateForm.patchValue({
      nom_objet: template.nom_objet,
      description: template.description || '',
      diffusion_list_id: template.diffusion_list_id || null
    });
  }

  /**
   * Réinitialiser le formulaire
   */
  private resetForm(): void {
    this.templateForm.reset();
    const actionsArray = this.getActionsFormArray();
    actionsArray.clear();
    actionsArray.push(this.createActionGroup());

    this.templateForm.patchValue({
      nom_objet: '',
      description: '',
      diffusion_list_id: null
    });
  }

  /**
   * Ajouter une action
   */
  addAction(): void {
    this.getActionsFormArray().push(this.createActionGroup());
  }

  /**
   * Supprimer une action
   */
  removeAction(index: number): void {
    const actionsArray = this.getActionsFormArray();
    if (actionsArray.length > 1) {
      actionsArray.removeAt(index);
    }
  }

  /**
   * Gère l'appui sur "Entrée" dans un champ d'action.
   * Empêche la soumission du formulaire.
   */
  onActionInputEnter(event: Event): void {
    event.preventDefault();
  }

  /**
   * Annuler le formulaire
   */
  cancelForm(): void {
    this.showForm = false;
    this.resetForm();
  }

  /**
   * Soumettre le formulaire
   */
  onSubmit(): void {
    if (!this.templateForm.valid) {
      this.markFormGroupTouched();
      return;
    }

    this.isSubmitting = true;
    const formValue = this.templateForm.value;

    const request = {
      nom_objet: formValue.nom_objet,
      description: formValue.description,
      actions: formValue.actions.filter((action: any) => action.action.trim()),
      diffusion_list_id: formValue.diffusion_list_id
    };

    const operation = this.isEditing
      ? this.templateService.updateTemplate(this.currentEditingId!, request)
      : this.templateService.createTemplate(request);

    operation.subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success(
            this.isEditing ? 'Modèle modifié avec succès' : 'Modèle créé avec succès'
          );
          this.showForm = false;
          this.loadTemplates();
          this.resetForm();
        }
        this.isSubmitting = false;
      },
      error: (error) => {
        if (error.status === 422 && error.error?.errors?.nom_objet) {
          this.notificationService.error(
            'Nom de modèle déjà utilisé',
            'Ce nom de modèle existe déjà. Veuillez en choisir un autre.'
          );
        } else {
          this.notificationService.error(
            this.isEditing ? 'Erreur lors de la modification' : 'Erreur lors de la création'
          );
        }
        console.error(error);
        this.isSubmitting = false;
      }
    });
  }

  /**
   * Supprimer un template
   */
  deleteTemplate(templateId: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce modèle ?')) {
      this.templateService.deleteTemplate(templateId).subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success('Modèle supprimé avec succès');
            this.loadTemplates();
          }
        },
        error: (error) => {
          this.notificationService.error('Erreur lors de la suppression');
          console.error(error);
        }
      });
    }
  }

  /**
   * Marquer tous les champs comme touchés pour afficher les erreurs
   */
  private markFormGroupTouched(): void {
    Object.keys(this.templateForm.controls).forEach(key => {
      const control = this.templateForm.get(key);
      control?.markAsTouched();

      if (control instanceof FormArray) {
        control.controls.forEach(nestedControl => {
          if (nestedControl instanceof FormGroup) {
            Object.keys(nestedControl.controls).forEach(nestedKey => {
              nestedControl.get(nestedKey)?.markAsTouched();
            });
          }
        });
      }
    });
  }

  /**
   * SÉLECTIONNER UN TEMPLATE (nouvelle fonctionnalité)
   */
  selectTemplate(template: IncidentTemplate): void {
    // Récupérer les détails complets du template
    this.templateService.getTemplate(template.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.templateSelected.emit({
            id: response.data.id,
            nom_objet: response.data.nom_objet,
            actions: response.data.actions || []
          });
          this.closeModal();
        }
      },
      error: (error) => {
        this.notificationService.error('Erreur lors de la sélection du modèle');
        console.error(error);
      }
    });
  }
}