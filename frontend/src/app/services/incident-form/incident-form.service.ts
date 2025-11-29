// src/app/services/incident-form/incident-form.service.ts
import { Injectable } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { Incident, IncidentStatus, IncidentFormData } from '../../models';
import { AppConfigService } from '../app-config/app-config.service';
import { IncidentTemplateService, IncidentTemplate } from '../incident-template/incident-template.service';

export function urssafEmailValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const email = control.value as string;
    if (!email) {
      return null; // Laissez le validateur 'required' s'en occuper
    }
    const isValid = email.toLowerCase().endsWith('@urssaf.fr');
    return isValid ? null : { urssafEmail: true };
  };
}

export interface FormValidationResult {
  isValid: boolean;
  errors: string[];
  progress: number;
  canSubmit: boolean;
}


export interface FormState {
  form: FormGroup;
  validation: FormValidationResult;
  isEditMode: boolean;
  isSubmitting: boolean;
  selectedTemplate: IncidentTemplate | null;
  templateEmails: string[];
  excludedTemplateEmails: string[];
  hasUnsavedChanges: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class IncidentFormService {

  constructor(
    private fb: FormBuilder,
    private appConfigService: AppConfigService,

    private templateService: IncidentTemplateService
  ) { }

  // ===== CRÉATION ET INITIALISATION DU FORMULAIRE =====

  createFormState(initialIncident?: Incident): FormState {
    const form = this.createIncidentForm();
    const isEditMode = !!(initialIncident && initialIncident.id);

    const formState: FormState = {
      form,
      validation: { isValid: false, errors: [], progress: 0, canSubmit: false }, // Initialisation par défaut
      isEditMode,
      isSubmitting: false,
      selectedTemplate: null,
      templateEmails: [],
      excludedTemplateEmails: [],
      hasUnsavedChanges: false
    };

    if (isEditMode) {
      this.initializeForEdition(formState, initialIncident!);
    } else {
      this.initializeForCreation(formState);
    }

    this.setupFormSubscriptions(formState);
    return formState;
  }

  private createIncidentForm(): FormGroup {
    return this.fb.group({
      template_id: [null],
      object: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200)]],
      domains: [[], [Validators.required, Validators.minLength(1)]],
      gravity: ['moyen', Validators.required],
      status: ['en_cours', Validators.required],
      meteo: [false, Validators.required],
      dateOuverture: [new Date()],
      dateCloture: [null],
      ticketNumber: ['', [Validators.pattern(/^[A-Z0-9-]+$/)]],
      lienTicketHelpy: ['', [Validators.pattern(/^https?:\/\/.*(helpy|\/ticket\/).*$/i)]],
      lienTicketTandem: ['', [Validators.pattern(/^https?:\/\/.*(tandem|\/ticket\/).*$/i)]],
      isNational: [false],
      publicsImpactes: [[]],
      sitesImpactes: [[]],
      description: ['', Validators.required],
      actionsMenees: this.fb.array([]),
      actionsAMener: this.fb.array([]),
      indisponibiliteJours: [null, [Validators.min(0)]],
      indisponibiliteHeures: [null, [Validators.min(0), Validators.max(23)]],
      indisponibiliteMinutes: [null, [Validators.min(0), Validators.max(59)]],
      indisponibiliteContexte: [''],
      mailAlerte: this.fb.array([])
    }, { validators: [IncidentFormService.dateClotureValidator(), IncidentFormService.actionsRequiredValidator()] });
  }

  private setupFormSubscriptions(formState: FormState): void {
    const destroy$ = new Subject<void>();

    // Suivi des changements du formulaire
    formState.form.valueChanges.pipe(
      debounceTime(1000), // Sauvegarde toutes les secondes pour ne pas surcharger
      takeUntil(destroy$)
    ).subscribe(values => {
      formState.validation = this.validateForm(formState.form);
      formState.hasUnsavedChanges = formState.form.dirty;

      // Sauvegarder uniquement si le formulaire n'est pas en mode édition
      if (!formState.isEditMode) {
        localStorage.setItem('incompleteIncident', JSON.stringify(values));
      }
    });

    // Gestion automatique de la date de clôture
    formState.form.get('status')?.valueChanges.pipe(
      debounceTime(100),
      takeUntil(destroy$)
    ).subscribe(status => {
      this.handleStatusChange(formState, status);
    });

    // Gestion de la rétrogradation
    formState.form.get('gravity')?.valueChanges.pipe(
      takeUntil(destroy$)
    ).subscribe(gravity => {
      this.handleGravityChange(formState, gravity);
    });
  }

  private handleStatusChange(formState: FormState, status: string): void {
    const dateClotureControl = formState.form.get('dateCloture');

    if (status === 'cloture' || status === 'archive') {
      if (!dateClotureControl?.value) {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const localDateTimeString = `${year}-${month}-${day}T${hours}:${minutes}`;
        dateClotureControl?.setValue(localDateTimeString);
      }
    } else {
      dateClotureControl?.setValue(null);
    }
  }

  private handleGravityChange(formState: FormState, newGravity: string): void {
    if (!formState.isEditMode) return;

    const statusControl = formState.form.get('status');
    if (!statusControl) return;

    if (newGravity === 'moyen' || newGravity === 'faible') {
      if (statusControl.value === 'en_attente') {
        statusControl.setValue('en_cours');
        statusControl.disable();
      }
    } else if (newGravity === 'grave' || newGravity === 'tres_grave') {
      if (statusControl.value === 'en_cours') {
        statusControl.setValue('en_attente');
        statusControl.enable();
      }
    }
  }

  // ===== GESTION DES TEMPLATES =====

  async loadAvailableTemplates(): Promise<IncidentTemplate[]> {
    return new Promise((resolve) => {
      this.templateService.getActiveTemplates().subscribe({
        next: (response) => {
          resolve(response.success ? response.data : []);
        },
        error: () => resolve([])
      });
    });
  }

  async applyTemplate(formState: FormState, templateId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.templateService.getTemplate(templateId).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            formState.selectedTemplate = response.data;

            // IMPORTANT: Filtrer les emails exclus dès l'application du template
            const allTemplateEmails = response.data.diffusion_list_emails || [];
            formState.templateEmails = allTemplateEmails.filter(
              email => !formState.excludedTemplateEmails.includes(email)
            );

            this.populateFormWithTemplate(formState, response.data);
            resolve();
          } else {
            reject(new Error('Template non trouvé'));
          }
        },
        error: (error) => reject(error)
      });
    });
  }

  private populateFormWithTemplate(formState: FormState, template: IncidentTemplate): void {
    // Appliquer l'objet si vide
    const objetControl = formState.form.get('object');
    if (!objetControl?.value?.trim()) {
      objetControl?.setValue(this.sanitizeString(template.nom_objet));
    }

    // Appliquer la description
    if (template.description) {
      formState.form.get('description')?.setValue(this.sanitizeString(template.description));
    }

    // Appliquer les actions
    if (template.actions) {
      this.applyTemplateActions(formState, template.actions);
    }

    this.sanitizeTemplateData(formState.form);
  }

  private applyTemplateActions(formState: FormState, templateActions: any[]): void {
    const actionsArray = formState.form.get('actionsAMener') as FormArray;

    // Vider les actions existantes
    while (actionsArray.length !== 0) {
      actionsArray.removeAt(0);
    }

    // Ajouter les nouvelles actions
    templateActions.forEach(templateAction => {
      const actionControl = this.createActionControl(templateAction.action);
      actionsArray.push(actionControl);
    });
  }

  /**
   * Retire un email du template pour cet incident spécifique
   * L'email est ajouté à la liste des exclusions et retiré de l'affichage
   */
  removeTemplateEmail(formState: FormState, index: number): void {
    if (formState.templateEmails.length > index) {
      const emailToRemove = formState.templateEmails[index];

      // Ajouter aux exclusions pour persistance
      if (!formState.excludedTemplateEmails.includes(emailToRemove)) {
        formState.excludedTemplateEmails.push(emailToRemove);
      }

      // Supprimer de l'affichage
      formState.templateEmails.splice(index, 1);

      // Marquer le formulaire comme modifié pour déclencher la sauvegarde
      formState.form.markAsDirty();
    }
  }

  /**
   * Restaure un email exclu du template (si nécessaire)
   */
  restoreTemplateEmail(formState: FormState, emailToRestore: string): void {
    // Retirer de la liste des exclusions
    const indexExclusion = formState.excludedTemplateEmails.indexOf(emailToRestore);
    if (indexExclusion > -1) {
      formState.excludedTemplateEmails.splice(indexExclusion, 1);
    }

    // Ajouter à la liste d'affichage si pas déjà présent
    if (!formState.templateEmails.includes(emailToRestore)) {
      formState.templateEmails.push(emailToRestore);
    }

    formState.form.markAsDirty();
  }

  // ===== INITIALISATION =====

  private initializeForCreation(formState: FormState): void {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const localDateTimeString = `${year}-${month}-${day}T${hours}:${minutes}`;

    formState.form.patchValue({
      dateOuverture: localDateTimeString,
      status: 'en_cours',
      gravity: 'moyen',
      meteo: false,
      isNational: false,
      domains: [],
      publicsImpactes: [],
      sitesImpactes: [],
      _originalStatus: null
    });

    const mailAlerteArray = formState.form.get('mailAlerte') as FormArray;
    mailAlerteArray.clear();

    formState.form.get('template_id')?.enable();
  }

  private initializeForEdition(formState: FormState, incident: Incident): void {
    // 1. Peuple les champs simples et les FormArrays de base
    this.populateForm(formState.form, incident);
    this.populateMailAlerte(formState.form, incident.mailAlerte || []);

    // 2. Si un template est associé, recharger ses informations pour reconstruire l'état
    if (incident.template_id) {
      formState.form.get('template_id')?.setValue(incident.template_id, { emitEvent: false });

      this.templateService.getTemplate(incident.template_id).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            formState.selectedTemplate = response.data;
            const allTemplateEmails = response.data.diffusion_list_emails || [];

            // La vraie liste des emails exclus est celle sauvegardée avec l'incident.
            const savedExcludedEmails = incident.template_excluded_emails || [];
            formState.excludedTemplateEmails = [...savedExcludedEmails];

            // Les suggestions visibles sont la liste complète MOINS les emails exclus.
            formState.templateEmails = allTemplateEmails.filter(
              (email: string) => !savedExcludedEmails.includes(email)
            );
          }
        },
        error: (error) => {
          console.error('Erreur chargement template en édition:', error);
          // En cas d'erreur, on initialise des listes vides
          formState.templateEmails = [];
          formState.excludedTemplateEmails = [];
        }
      });
    } else {
      // S'il n'y a pas de template, les listes automatiques sont simplement vides
      formState.templateEmails = [];
      formState.excludedTemplateEmails = [];
    }

    // 3. Finaliser l'initialisation
    formState.validation = this.validateForm(formState.form);
    this.setOriginalStatus(formState.form, incident.status || 'en_cours');
    formState.form.get('template_id')?.disable();
  }

  // ===== GESTION DES FORMARRAY =====

  addEmailToFormArray(formState: FormState, email: string): boolean {
    if (email && /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      const mailArray = formState.form.get('mailAlerte') as FormArray;
      mailArray.push(this.fb.control(email, [Validators.email, urssafEmailValidator()]));

      // Si l'email ajouté manuellement était dans la liste des exclus, on l'en retire.
      // Cela annule l'exclusion et garantit que l'email sera bien envoyé.
      const indexInExcluded = formState.excludedTemplateEmails.indexOf(email);
      if (indexInExcluded > -1) {
        formState.excludedTemplateEmails.splice(indexInExcluded, 1);
      }

      return true;
    }
    return false;
  }

  removeEmailFromFormArray(formState: FormState, index: number): void {
    const mailArray = formState.form.get('mailAlerte') as FormArray;
    mailArray.removeAt(index);
  }

  addActionToFormArray(formState: FormState, actionText: string, arrayName: 'actionsAMener' | 'actionsMenees'): boolean {
    if (actionText.trim()) {
      const formArray = formState.form.get(arrayName) as FormArray;
      formArray.push(this.createActionControl(actionText));
      return true;
    }
    return false;
  }

  removeActionFromFormArray(formState: FormState, index: number, arrayName: 'actionsAMener' | 'actionsMenees'): void {
    const formArray = formState.form.get(arrayName) as FormArray;
    formArray.removeAt(index);
  }

  transferAction(formState: FormState, index: number, from: 'actionsAMener' | 'actionsMenees'): void {
    const fromArray = formState.form.get(from) as FormArray;
    const toArray = formState.form.get(from === 'actionsAMener' ? 'actionsMenees' : 'actionsAMener') as FormArray;

    const actionControl = fromArray.at(index);
    if (actionControl) {
      toArray.push(this.createActionControl(actionControl.value));
      fromArray.removeAt(index);
    }
  }

  createActionControl(text: string): AbstractControl {
    const cleanText = this.sanitizeString(text);
    return this.fb.control(cleanText, [Validators.required, Validators.minLength(3)]);
  }

  // ===== GESTION DES SÉLECTIONS MULTIPLES =====

  toggleSelection(formState: FormState, field: 'domains' | 'publicsImpactes' | 'sitesImpactes', value: string): void {
    const currentValues = formState.form.get(field)?.value || [];
    const index = currentValues.indexOf(value);

    if (index > -1) {
      currentValues.splice(index, 1);
    } else {
      currentValues.push(value);
    }

    formState.form.patchValue({ [field]: currentValues });
  }

  isSelected(formState: FormState, field: 'domains' | 'publicsImpactes' | 'sitesImpactes', value: string): boolean {
    const values = formState.form.get(field)?.value || [];
    return values.includes(value);
  }

  selectAll(formState: FormState, field: 'domains' | 'publicsImpactes' | 'sitesImpactes'): void {
    let allValues: string[] = [];

    switch (field) {
      case 'domains':
        allValues = this.domainOptions.map(d => d.value);
        break;
      case 'publicsImpactes':
        allValues = this.publicOptions.map(p => p.value);
        break;
      case 'sitesImpactes':
        allValues = this.siteOptions.map(s => s.value);
        break;
    }

    formState.form.patchValue({ [field]: allValues });
  }

  clearAll(formState: FormState, field: 'domains' | 'publicsImpactes' | 'sitesImpactes'): void {
    const patchValue: any = { [field]: [] };
    if (field === 'sitesImpactes') {
      patchValue.isNational = false;
    }
    formState.form.patchValue(patchValue);
  }

  // ===== VALIDATION =====

  validateForm(form: FormGroup): FormValidationResult {
    const errors: string[] = [];

    if (!this.isObjectValid(form)) {
      errors.push('• Objet de l\'incident (minimum 5 caractères)');
    }

    if (!this.areDomainsValid(form)) {
      errors.push('• Au moins un domaine doit être sélectionné');
    }

    if (!this.isDescriptionValid(form)) {
      errors.push('• Description de l\'incident');
    }

    if (!this.areActionsValid(form)) {
      const status = form.get('status')?.value;
      if (status === 'en_cours') {
        errors.push('• Au moins une action à mener (incident en cours)');
      }
    }

    const mailAlerteControl = form.get('mailAlerte');
    if (mailAlerteControl && mailAlerteControl.invalid) {
      errors.push('• Au moins un email manuel est invalide (doit se terminer par @urssaf.fr)');
    }

    const progress = this.calculateFormProgress(form);

    return {
      isValid: errors.length === 0 && form.valid,
      errors,
      progress,
      canSubmit: errors.length === 0 && form.valid
    };
  }

  getMissingFields(form: FormGroup): string[] {
    const issues: string[] = [];

    if (!this.isObjectValid(form)) {
      issues.push('Objet');
    }

    if (!this.areDomainsValid(form)) {
      issues.push('Domaines');
    }

    if (!this.isDescriptionValid(form)) {
      issues.push('Description');
    }

    const status = form.get('status')?.value;
    if (status === 'en_cours' && !this.areActionsValid(form)) {
      issues.push('Actions à mener');
    }

    if (status === 'cloture' && !form.get('dateCloture')?.value) {
      issues.push('Date de clôture');
    }

    // Validation des formats
    const fieldValidations = [
      { field: 'lienTicketHelpy', label: 'Format Lien HELPY' },
      { field: 'lienTicketTandem', label: 'Format Lien TANDEM' },
      { field: 'ticketNumber', label: 'Format N° Ticket' }
    ];

    fieldValidations.forEach(({ field, label }) => {
      const control = form.get(field);
      if (control?.value && control.hasError('pattern')) {
        issues.push(label);
      }
    });

    if (form.get('dateCloture')?.hasError('dateClotureBeforeOuverture')) {
      issues.push('Date de clôture invalide');
    }

    const mailAlerteControl = form.get('mailAlerte');
    if (mailAlerteControl && mailAlerteControl.invalid) {
      issues.push('Emails manuels invalides');
    }

    return issues;
  }

  isFieldInvalid(form: FormGroup, fieldName: string): boolean {
    const field = form.get(fieldName);
    return !!(field?.invalid && (field?.dirty || field?.touched));
  }

  getFieldError(form: FormGroup, fieldName: string): string | null {
    const field = form.get(fieldName);

    if (field?.errors && (field.dirty || field.touched)) {
      if (field.errors['required']) return 'Ce champ est obligatoire';
      if (field.errors['minlength']) return `Minimum ${field.errors['minlength'].requiredLength} caractères`;
      if (field.errors['maxlength']) return `Maximum ${field.errors['maxlength'].requiredLength} caractères`;
      if (field.errors['min']) return `La valeur minimale est ${field.errors['min'].min}.`;
      if (field.errors['max']) return `La valeur maximale est ${field.errors['max'].max}.`;
      if (field.errors['pattern']) return 'Format invalide';
      if (field.errors['dateClotureBeforeOuverture']) return 'La date de clôture ne peut pas être antérieure à la date d\'ouverture.';
    }

    return null;
  }

  markFormGroupTouched(form: FormGroup | FormArray): void {
    Object.values(form.controls).forEach(control => {
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      } else {
        control.markAsTouched();
      }
    });
  }

  // ===== EXTRACTION DES DONNÉES =====

  getFormData(formState: FormState): IncidentFormData {
    const formValue = formState.form.getRawValue();

    const cleanedObject = this.sanitizeObjectField(formValue.object);
    const parsedOpenedAt = formValue.dateOuverture ? new Date(formValue.dateOuverture) : undefined;
    const parsedClosedAt = formValue.dateCloture ? new Date(formValue.dateCloture) : undefined;

    const tempsIndisponibilite = this.combineTempsIndisponibilite(
      Number(formValue.indisponibiliteJours) || 0,
      Number(formValue.indisponibiliteHeures) || 0,
      Number(formValue.indisponibiliteMinutes) || 0,
      this.sanitizeString(formValue.indisponibiliteContexte)
    );

    const cleanedActionsAMener = (formValue.actionsAMener || [])
      .map((action: any) => this.sanitizeString(action))
      .filter((action: string) => action.length > 0);

    const cleanedActionsMenees = (formValue.actionsMenees || [])
      .map((action: any) => this.sanitizeString(action))
      .filter((action: string) => action.length > 0);

    const manualEmails = (formValue.mailAlerte || [])
      .map((email: any) => this.sanitizeString(email))
      .filter((email: string) => email.length > 0 && email.includes('@'));

    let autoEmails: string[] = [];

    if (formState.templateEmails && formState.templateEmails.length > 0) {
      // Filtrer les emails du template qui ne sont PAS dans les emails manuels
      autoEmails = formState.templateEmails.filter(
        templateEmail => !manualEmails.includes(templateEmail)
      );
    }

    return {
      object: cleanedObject,
      domains: formValue.domains || [],
      gravity: formValue.gravity,
      status: formValue.status,
      dateOuverture: parsedOpenedAt,
      dateCloture: parsedClosedAt,
      isNational: formValue.isNational,
      ticketNumber: this.sanitizeString(formValue.ticketNumber),
      lienTicketHelpy: this.sanitizeString(formValue.lienTicketHelpy),
      lienTicketTandem: this.sanitizeString(formValue.lienTicketTandem),
      meteo: formValue.meteo,
      publicsImpactes: formValue.publicsImpactes || [],
      sitesImpactes: formValue.sitesImpactes || [],
      description: this.sanitizeQuillContent(formValue.description),
      actionsMenees: cleanedActionsMenees,
      actionsAMener: cleanedActionsAMener,
      tempsIndisponibilite: tempsIndisponibilite,
      mailAlerte: manualEmails, // Uniquement les emails manuels
      auto_notified_emails: autoEmails, // Uniquement les emails automatiques
      template_id: formState.selectedTemplate?.id,
      template_excluded_emails: formState.excludedTemplateEmails
    };
  }

  // ===== SANITISATION =====

  sanitizeString(value: any): string {
    if (typeof value !== 'string') {
      return String(value || '');
    }

    return value
      .trim()
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\s+/g, ' ')
      .substring(0, 500);
  }

  private sanitizeObjectField(objectValue: any): string {
    let cleaned = this.sanitizeString(objectValue);

    cleaned = cleaned
      .replace(/&[a-zA-Z0-9#]+;/g, '')
      .replace(/<[^>]*>/g, '')
      .replace(/\\/g, '')
      .replace(/[""'']/g, '"')
      .replace(/…/g, '...')
      .replace(/[–—]/g, '-')
      .trim();

    if (cleaned.length < 5) {
      throw new Error('L\'objet doit contenir au minimum 5 caractères');
    }

    return cleaned;
  }

  private sanitizeQuillContent(content: any): string {
    if (!content) return '';

    let cleaned = String(content);

    cleaned = cleaned
      .replace(/ql-editor/g, '')
      .replace(/contenteditable="[^"]*"/g, '')
      .replace(/spellcheck="[^"]*"/g, '')
      .replace(/data-gramm="[^"]*"/g, '')
      .replace(/class="[^"]*ql-[^"]*"/g, '')
      .trim();

    return cleaned;
  }

  sanitizeTemplateData(form: FormGroup): void {
    const objectControl = form.get('object');
    if (objectControl?.value) {
      try {
        const cleanedObject = this.sanitizeObjectField(objectControl.value);
        objectControl.setValue(cleanedObject, { emitEvent: false });
      } catch (error) {
        objectControl.setValue('', { emitEvent: false });
      }
    }

    const descriptionControl = form.get('description');
    if (descriptionControl?.value) {
      const cleanedDescription = this.sanitizeQuillContent(descriptionControl.value);
      descriptionControl.setValue(cleanedDescription, { emitEvent: false });
    }

    const actionsArray = form.get('actionsAMener') as FormArray;
    if (actionsArray.length > 0) {
      for (let i = 0; i < actionsArray.length; i++) {
        const actionControl = actionsArray.at(i);
        if (actionControl.value) {
          const cleanedAction = this.sanitizeString(actionControl.value);
          actionControl.setValue(cleanedAction, { emitEvent: false });
        }
      }
    }
  }

  // ===== MÉTHODES PRIVÉES =====

  private populateForm(form: FormGroup, incident: Incident): void {
    const formatToLocalISO = (date: Date | string | undefined | null): string | null => {
      if (!date) return null;
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return null;

      // Convertir la date UTC en heure locale pour l'affichage dans l'input datetime-local
      const year = dateObj.getFullYear();
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const day = dateObj.getDate().toString().padStart(2, '0');
      const hours = dateObj.getHours().toString().padStart(2, '0');
      const minutes = dateObj.getMinutes().toString().padStart(2, '0');

      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const cleanedIncident = {
      ...incident,
      object: this.sanitizeString(incident.object || ''),
      description: this.sanitizeQuillContent(incident.description || ''),
    };

    form.patchValue({
      template_id: cleanedIncident.template_id || null,
      object: cleanedIncident.object,
      domains: cleanedIncident.domains || [],
      gravity: cleanedIncident.gravity || 'moyen',
      status: cleanedIncident.status || 'en_cours',
      meteo: cleanedIncident.meteo ?? false,
      dateOuverture: formatToLocalISO(cleanedIncident.dateOuverture),
      dateCloture: formatToLocalISO(cleanedIncident.dateCloture),
      ticketNumber: this.sanitizeString(cleanedIncident.ticketNumber || ''),
      lienTicketHelpy: this.sanitizeString(cleanedIncident.lienTicketHelpy || ''),
      lienTicketTandem: this.sanitizeString(cleanedIncident.lienTicketTandem || ''),
      isNational: cleanedIncident.isNational ?? false,
      publicsImpactes: cleanedIncident.publicsImpactes || [],
      sitesImpactes: cleanedIncident.sitesImpactes || [],
      description: cleanedIncident.description,
      _originalStatus: cleanedIncident.status
    });

    // Gestion des FormArray
    this.populateFormArray(form, 'actionsAMener', cleanedIncident.actionsAMener || []);
    this.populateFormArray(form, 'actionsMenees', cleanedIncident.actionsMenees || []);
    this.populateMailAlerte(form, incident.mailAlerte);

    // Gestion du temps d'indisponibilité
    if (cleanedIncident.tempsIndisponibilite) {
      const { jours, heures, minutes, contexte } = this.parseTempsIndisponibilite(cleanedIncident.tempsIndisponibilite);
      form.patchValue({
        indisponibiliteJours: jours,
        indisponibiliteHeures: heures,
        indisponibiliteMinutes: minutes,
        indisponibiliteContexte: this.sanitizeString(contexte)
      });
    }
  }

  private populateFormArray(form: FormGroup, arrayName: string, values: string[]): void {
    const formArray = form.get(arrayName) as FormArray;
    formArray.clear();
    values.forEach((value: string) => {
      const cleanValue = this.sanitizeString(value);
      formArray.push(this.fb.control(cleanValue));
    });
  }

  private populateMailAlerte(form: FormGroup, mailAlerte: any): void {
    const mailAlerteArray = form.get('mailAlerte') as FormArray;
    mailAlerteArray.clear();

    if (mailAlerte) {
      if (typeof mailAlerte === 'string') {
        const emails = mailAlerte.match(/[\w.-]+@[\w.-]+\.\w+/g);
        if (emails) {
          emails.forEach((email: string) => {
            mailAlerteArray.push(this.fb.control(email.trim(), [Validators.email, urssafEmailValidator()]));
          });
        }
      } else if (Array.isArray(mailAlerte)) {
        mailAlerte.forEach((email: string) => {
          if (email && typeof email === 'string' && email.includes('@')) {
            mailAlerteArray.push(this.fb.control(email.trim(), [Validators.email, urssafEmailValidator()]));
          }
        });
      }
    }
  }

  private isObjectValid(form: FormGroup): boolean {
    const value = form.get('object')?.value?.trim();
    return !!(value && value.length >= 5);
  }

  private areDomainsValid(form: FormGroup): boolean {
    const domains = form.get('domains')?.value;
    return Array.isArray(domains) && domains.length > 0;
  }

  private isDescriptionValid(form: FormGroup): boolean {
    const value = form.get('description')?.value?.trim();
    return !!(value && value.length > 0);
  }

  private areActionsValid(form: FormGroup): boolean {
    const status = form.get('status')?.value;

    if (status === 'cloture' || status === 'archive') {
      return true;
    }

    if (status === 'en_cours') {
      const actions = form.get('actionsAMener') as FormArray;
      return actions.length > 0 && actions.controls.some(control =>
        control.value?.trim()?.length >= 3
      );
    }

    return true;
  }

  private calculateFormProgress(form: FormGroup): number {
    const requiredFields = [
      'object', 'domains', 'gravity', 'status', 'meteo', 'description', 'actionsAMener'
    ];

    let completedRequiredFields = 0;

    requiredFields.forEach(fieldName => {
      const isCompleted = this.isFieldCompletedForProgress(form, fieldName);
      if (isCompleted) {
        completedRequiredFields++;
      }
    });

    return Math.round((completedRequiredFields / requiredFields.length) * 100);
  }

  private isFieldCompletedForProgress(form: FormGroup, fieldName: string): boolean {
    const control = form.get(fieldName);
    if (!control) return false;

    switch (fieldName) {
      case 'object': return this.isObjectValid(form);
      case 'domains': return this.areDomainsValid(form);
      case 'gravity':
      case 'status': return control.value && control.value !== '';
      case 'meteo': return control.value !== null && control.value !== undefined;
      case 'description': return this.isDescriptionValid(form);
      case 'actionsAMener': return this.areActionsValid(form);
      default: return control.valid;
    }
  }

  private setOriginalStatus(form: FormGroup, originalStatus: IncidentStatus): void {
    if (!form.contains('_originalStatus')) {
      form.addControl('_originalStatus', this.fb.control(originalStatus));
    } else {
      form.get('_originalStatus')?.setValue(originalStatus);
    }
  }

  private combineTempsIndisponibilite(jours: number, heures: number, minutes: number, contexte: string): string {
    let result = '';
    if (jours > 0) result += `${jours} jour(s)`;
    if (heures > 0) {
      if (result) result += ' ';
      result += `${heures} heure(s)`;
    }
    if (minutes > 0) {
      if (result) result += ' ';
      result += `${minutes} minute(s)`;
    }
    if (contexte && contexte.trim()) {
      const cleanContexte = this.sanitizeString(contexte);
      if (result) {
        result += ` (Contexte: ${cleanContexte})`;
      } else {
        result = cleanContexte;
      }
    }
    return result;
  }

  private parseTempsIndisponibilite(tempsIndisponibilite: string): { jours: number | null, heures: number | null, minutes: number | null, contexte: string } {
    if (!tempsIndisponibilite) {
      return { jours: null, heures: null, minutes: null, contexte: '' };
    }

    const cleanedTime = this.sanitizeString(tempsIndisponibilite);
    const contexteMatch = cleanedTime.match(/\(Contexte:\s*(.*)\)/);
    const contexte = contexteMatch ? contexteMatch[1].trim() : '';
    const mainPart = cleanedTime.replace(/\s*\(Contexte:.*\)/, '').trim();

    const joursMatch = mainPart.match(/(\d+)\s*jour(s)?/i);
    const heuresMatch = mainPart.match(/(\d+)\s*heure(s)?/i);
    const minutesMatch = mainPart.match(/(\d+)\s*minute(s)?/i);

    const jours = joursMatch ? parseInt(joursMatch[1], 10) : null;
    const heures = heuresMatch ? parseInt(heuresMatch[1], 10) : null;
    const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : null;

    return { jours, heures, minutes, contexte };
  }

  // ===== VALIDATEURS STATIQUES =====

  static dateClotureValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const formGroup = control as FormGroup;
      const dateOuvertureControl = formGroup.get('dateOuverture');
      const dateClotureControl = formGroup.get('dateCloture');

      if (!dateOuvertureControl || !dateClotureControl) {
        return null;
      }

      const dateOuverture = dateOuvertureControl.value ? new Date(dateOuvertureControl.value) : null;
      const dateCloture = dateClotureControl.value ? new Date(dateClotureControl.value) : null;

      if (!dateCloture || !dateOuverture) {
        if (dateClotureControl.hasError('dateClotureBeforeOuverture')) {
          const errors = dateClotureControl.errors;
          if (errors) {
            delete errors['dateClotureBeforeOuverture'];
            if (Object.keys(errors).length === 0) {
              dateClotureControl.setErrors(null);
            } else {
              dateClotureControl.setErrors(errors);
            }
          }
        }
        return null;
      }

      if (dateCloture.getTime() < dateOuverture.getTime()) {
        dateClotureControl.setErrors({ ...dateClotureControl.errors, dateClotureBeforeOuverture: true });
        return { dateMismatch: true };
      } else {
        if (dateClotureControl.hasError('dateClotureBeforeOuverture')) {
          const errors = dateClotureControl.errors;
          if (errors) {
            delete errors['dateClotureBeforeOuverture'];
            if (Object.keys(errors).length === 0) {
              dateClotureControl.setErrors(null);
            } else {
              dateClotureControl.setErrors(errors);
            }
          }
        }
      }

      return null;
    };
  }

  static actionsRequiredValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const formGroup = control as FormGroup;
      const statusControl = formGroup.get('status');
      const actionsAMenerControl = formGroup.get('actionsAMener') as FormArray;

      if (!statusControl || !actionsAMenerControl) {
        return null;
      }

      const isRequired = !['cloture', 'archive'].includes(statusControl.value);
      const isEmpty = actionsAMenerControl.length === 0;

      if (isRequired && isEmpty) {
        actionsAMenerControl.setErrors({ required: true });
        return { actionsRequired: true };
      } else {
        const errors = actionsAMenerControl.errors;
        if (errors && errors['required']) {
          delete errors['required'];
          if (Object.keys(errors).length === 0) {
            actionsAMenerControl.setErrors(null);
          } else {
            actionsAMenerControl.setErrors(errors);
          }
        }
      }

      return null;
    };
  }

  // ===== ACCÈS AUX DONNÉES VIA APPCONFIG =====

  get domainOptions() { return this.appConfigService.getDomains(); }
  get gravityOptions() { return this.appConfigService.getGravityLevels(); }
  get statusOptions() { return this.appConfigService.getStatusTypes(); }
  get publicOptions() { return this.appConfigService.getPublics(); }
  get siteOptions() { return this.appConfigService.getSites(); }
  get groupedSiteOptions() { return this.appConfigService.getGroupedSiteOptions(); }
}