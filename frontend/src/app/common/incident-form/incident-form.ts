import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormArray, FormControl, Validators } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Incident, IncidentFormData } from '../../models';
import { NotificationService } from '../../services/notification/notification.service';
import { QuillConfigService } from '../../services/quill-config/quill-config.service';
import { IncidentFormService, FormState, urssafEmailValidator } from '../../services/incident-form/incident-form.service';
import { PermissionService } from '../../services/permissions/permission.service';
import { IncidentTemplateModal } from '../../pages/modals/incident-template/incident-template';
import { IncidentTemplate } from '../../services/incident-template/incident-template.service';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-incident-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, QuillModule, IncidentTemplateModal],
  templateUrl: './incident-form.html',
  styleUrls: ['./incident-form.scss']
})
export class IncidentForm implements OnInit, OnDestroy, OnChanges {
  private destroy$ = new Subject<void>();

  @Input() initialIncident: Incident | undefined;
  @Output() initialized = new EventEmitter<void>();
  @Output() save = new EventEmitter<IncidentFormData>();
  @Output() cancel = new EventEmitter<void>();
  @Output() progressChanged = new EventEmitter<number>();

  @ViewChild('templateModal') templateModal!: IncidentTemplateModal;

  // État du formulaire géré par le service
  formState!: FormState;

  // Templates disponibles
  availableTemplates: IncidentTemplate[] = [];

  // Contrôle pour le champ de saisie du nouvel email
  newEmailControl = new FormControl('', [Validators.email, urssafEmailValidator()]);

  // Utilisateur connecté
  connectedUser: string = '';
  isLoading = true;

  constructor(
    private notificationService: NotificationService,
    private quillConfigService: QuillConfigService,
    private formService: IncidentFormService,
    private authService: AuthService,
    private permissionService: PermissionService
  ) { }

  async ngOnInit(): Promise<void> {
    const currentUser = this.authService.getCurrentUser();
    this.connectedUser = currentUser?.full_name || 'Utilisateur inconnu';

    await this.loadAvailableTemplates();
    this.initializeForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialIncident'] && !changes['initialIncident'].firstChange && this.formState) {
      this.initializeForm();
    }
  }

  // ===== INITIALISATION =====

  private async loadAvailableTemplates(): Promise<void> {
    try {
      this.availableTemplates = await this.formService.loadAvailableTemplates();
    } catch (error) {
      console.error('Erreur chargement templates:', error);
    }
  }

  private initializeForm(): void {
    this.formState = this.formService.createFormState(this.initialIncident);
    this.setupProgressTracking();
    this.setupGravityListener(); // Ajout de l'écouteur
    this.isLoading = false;
    this.initialized.emit();
  }

  private setupProgressTracking(): void {
    // Écouter les changements de progression
    this.formState.form.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.progressChanged.emit(this.formState.validation.progress);
    });
  }

  /**
   * Met en place un écouteur sur le changement de la gravité pour ajuster le statut.
   */
  private setupGravityListener(): void {
    this.formState.form.get('gravity')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(newGravity => {
      const isNewGravityGrave = ['grave', 'tres_grave'].includes(newGravity);

      // Si la nouvelle gravité est élevée, forcer le statut à 'en_attente'.
      if (isNewGravityGrave) {
        if (this.formState.form.get('status')?.value !== 'en_attente') {
          this.formState.form.get('status')?.setValue('en_attente');
        }
      }
      // Si on repasse à une gravité faible/moyenne en mode création
      else if (!this.isEditMode) {
        this.formState.form.get('status')?.setValue('en_cours');
      }
    });
  }


  // ===== GESTION DES TEMPLATES =====

  async onTemplateSelected(event: Event): Promise<void> {
    const selectElement = event.target as HTMLSelectElement;
    const templateId = selectElement.value ? Number(selectElement.value) : null;

    if (templateId) {
      try {
        await this.formService.applyTemplate(this.formState, templateId);
        this.notificationService.success(
          'Modèle appliqué',
          'Les données ont été pré-remplies automatiquement'
        );
      } catch (error) {
        console.error('Erreur application template:', error);
        this.notificationService.error('Erreur lors de l\'application du modèle');
      }
    } else {
      this.resetToDefault();
    }
  }

  private resetToDefault(): void {
    this.formState.selectedTemplate = null;
    this.formState.templateEmails = [];
    this.formState.excludedTemplateEmails = [];

    // Réinitialiser le formulaire pour la création
    if (!this.formState.isEditMode) {
      this.formState = this.formService.createFormState();
    }
  }

  openTemplateManagement(): void {
    this.templateModal.openModal();
  }

  async onTemplateModalClosed(): Promise<void> {
    await this.loadAvailableTemplates();
  }

  removeTemplateEmail(index: number): void {
    this.formService.removeTemplateEmail(this.formState, index);
    this.notificationService.info('Destinataire du template retiré pour cet incident');
  }

  // ===== PROPRIÉTÉS CALCULÉES =====

  get incidentForm() { return this.formState?.form; }
  get isEditMode() { return this.formState?.isEditMode || false; }
  get isSubmitting() { return this.formState?.isSubmitting || false; }
  get selectedTemplateId() { return this.formState?.selectedTemplate?.id || null; }
  get templateDiffusionListEmails() { return this.formState?.templateEmails || []; }
  get formProgress() { return this.formState?.validation?.progress || 0; }
  get isFormValid() { return this.formState?.validation?.isValid || false; }
  get formErrors() { return this.formState?.validation?.errors || []; }
  get canSubmit() { return (this.formState?.validation?.canSubmit && !this.formState?.isSubmitting) || false; }
  get hasUnsavedChanges() { return this.formState?.hasUnsavedChanges || false; }

  // ===== ACCÈS AUX DONNÉES =====

  get domainOptions() { return this.formService.domainOptions; }
  get gravityOptions() { return this.formService.gravityOptions; }

  get statusOptions() {
    let availableStatus = this.formService.statusOptions;
    if (!this.permissionService.canArchiveIncidents()) {
      availableStatus = availableStatus.filter(status => status.value !== 'archive');
    }

    const formGravity = this.incidentForm.get('gravity')?.value;
    const isFormGravityGrave = ['grave', 'tres_grave'].includes(formGravity);

    const originalStatus = this.initialIncident?.status;
    const originalGravity = this.initialIncident?.gravity;
    const wasOriginalGravityGrave = ['grave', 'tres_grave'].includes(originalGravity as string);

    // Cas 1: La gravité dans le formulaire est "grave" ou "très grave".
    if (isFormGravityGrave) {
      // Si l'incident original était déjà grave et validé ("en_cours"), on autorise de le clôturer.
      if (this.isEditMode && wasOriginalGravityGrave && originalStatus === 'en_cours') {
        return availableStatus.filter(status => ['en_cours', 'cloture'].includes(status.value));
      }
      // Dans tous les autres cas de gravité élevée (création, ou changement de gravité vers élevée),
      // la seule option possible est "en_attente".
      return availableStatus.filter(status => status.value === 'en_attente');
    }

    // Cas 2: La gravité dans le formulaire est "faible" ou "moyen".
    // Dans ce cas, "en_attente" n'est jamais une option sélectionnable.
    return availableStatus.filter(status => status.value !== 'en_attente');
  }

  get publicOptions() { return this.formService.publicOptions; }
  get siteOptions() { return this.formService.siteOptions; }

  get quillConfig() { return this.quillConfigService.fullConfig; }
  get quillStylesDescription() { return this.quillConfigService.descriptionStyles; }

  // ===== GESTION DES FORMARRAY =====

  get actionsAMener() {
    return this.formState?.form.get('actionsAMener') as any;
  }

  get actionsMenees() {
    return this.formState?.form.get('actionsMenees') as any;
  }

  get mailAlerte() {
    return this.formState?.form.get('mailAlerte') as any;
  }

  addEmail(event: Event): void {
    event.preventDefault();
    this.newEmailControl.markAsTouched();

    if (this.newEmailControl.valid && this.newEmailControl.value) {
      const email = this.newEmailControl.value.trim();
      if (this.formState && this.formService.addEmailToFormArray(this.formState, email)) {
        this.newEmailControl.reset('');
      }
    }
  }

  removeEmail(index: number): void {
    if (this.formState) {
      this.formService.removeEmailFromFormArray(this.formState, index);
    }
  }

  addAction(inputElement: HTMLInputElement, event: Event): void {
    event.preventDefault();
    const actionText = inputElement.value.trim();

    if (this.formState && this.formService.addActionToFormArray(this.formState, actionText, 'actionsAMener')) {
      inputElement.value = '';
    }
  }

  removeAction(arrayName: 'actionsAMener' | 'actionsMenees', index: number): void {
    if (this.formState) {
      this.formService.removeActionFromFormArray(this.formState, index, arrayName);
    }
  }

  transferAction(index: number): void {
    if (this.formState) {
      this.formService.transferAction(this.formState, index, 'actionsAMener');
    }
  }

  untransferAction(index: number): void {
    if (this.formState) {
      this.formService.transferAction(this.formState, index, 'actionsMenees');
    }
  }

  // ===== MÉTHODES DE SÉLECTION MULTIPLE =====

  toggleDomainSelection(domain: string): void {
    if (this.formState) {
      this.formService.toggleSelection(this.formState, 'domains', domain);
    }
  }

  isDomainSelected(domain: string): boolean {
    return this.formState ? this.formService.isSelected(this.formState, 'domains', domain) : false;
  }

  togglePublicSelection(publicType: string): void {
    if (this.formState) {
      this.formService.toggleSelection(this.formState, 'publicsImpactes', publicType);
    }
  }

  isPublicSelected(publicType: string): boolean {
    return this.formState ? this.formService.isSelected(this.formState, 'publicsImpactes', publicType) : false;
  }

  toggleSiteSelection(siteImpacte: string): void {
    if (this.formState) {
      this.formService.toggleSelection(this.formState, 'sitesImpactes', siteImpacte);
    }
  }

  isSiteSelected(siteImpacte: string): boolean {
    return this.formState ? this.formService.isSelected(this.formState, 'sitesImpactes', siteImpacte) : false;
  }

  selectAllDomains(): void {
    if (this.formState) {
      this.formService.selectAll(this.formState, 'domains');
    }
  }

  clearAllDomains(): void {
    if (this.formState) {
      this.formService.clearAll(this.formState, 'domains');
    }
  }

  selectAllPublics(): void {
    if (this.formState) {
      this.formService.selectAll(this.formState, 'publicsImpactes');
    }
  }

  clearAllPublics(): void {
    if (this.formState) {
      this.formService.clearAll(this.formState, 'publicsImpactes');
    }
  }

  selectAllSites(): void {
    if (this.formState) {
      this.formService.selectAll(this.formState, 'sitesImpactes');
    }
  }

  clearAllSites(): void {
    if (this.formState) {
      this.formService.clearAll(this.formState, 'sitesImpactes');
    }
  }

  // ===== VALIDATION =====

  isFieldInvalid(fieldName: string): boolean {
    return this.formState ? this.formService.isFieldInvalid(this.formState.form, fieldName) : false;
  }

  getFieldError(fieldName: string): string | null {
    return this.formState ? this.formService.getFieldError(this.formState.form, fieldName) : null;
  }

  markAllFieldsAsTouched(): void {
    if (this.formState) {
      this.formService.markFormGroupTouched(this.formState.form);
    }
  }

  // ===== SOUMISSION =====

  public restoreFormArraysFromData(data: any): void {
    if (!this.formState || !data) return;

    // Restaurer les actions à mener
    if (data.actionsAMener && Array.isArray(data.actionsAMener)) {
      const actionsArray = this.formState.form.get('actionsAMener') as FormArray;
      actionsArray.clear();
      data.actionsAMener.forEach((action: string) => {
        this.formService.addActionToFormArray(this.formState, action, 'actionsAMener');
      });
    }

    // Restaurer les actions menées
    if (data.actionsMenees && Array.isArray(data.actionsMenees)) {
      const actionsArray = this.formState.form.get('actionsMenees') as FormArray;
      actionsArray.clear();
      data.actionsMenees.forEach((action: string) => {
        this.formService.addActionToFormArray(this.formState, action, 'actionsMenees');
      });
    }

    // Restaurer les emails
    if (data.mailAlerte && Array.isArray(data.mailAlerte)) {
      const mailArray = this.formState.form.get('mailAlerte') as FormArray;
      mailArray.clear();
      data.mailAlerte.forEach((email: string) => {
        this.formService.addEmailToFormArray(this.formState, email);
      });
    }
  }

  onSubmit(): void {
    if (!this.formState) return;

    this.markAllFieldsAsTouched();

    if (!this.canSubmit) {
      this.notificationService.error(
        'Formulaire incomplet',
        `Veuillez remplir les champs obligatoires :\n${this.formErrors.join('\n')}`
      );
      return;
    }

    this.formState.isSubmitting = true;
    const formData = this.formService.getFormData(this.formState);
    this.save.emit(formData);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  // ===== MÉTHODES UTILITAIRES =====

  resetSubmittingState(): void {
    if (this.formState) {
      this.formState.isSubmitting = false;
    }
  }

  getMissingFields(): string[] {
    return this.formState ? this.formService.getMissingFields(this.formState.form) : [];
  }

  getWordCount(fieldName: string): number {
    const fieldValue = this.incidentForm?.get(fieldName)?.value || '';
    return this.quillConfigService.getWordCount(fieldValue);
  }

  // ===== MÉTHODES SPÉCIFIQUES TEMPS =====

  onTimeInput(event: Event, controlName: string, maxValue: number): void {
    if (!this.incidentForm) return;

    const input = event.target as HTMLInputElement;
    let value = input.value.trim();

    if (value === '') {
      this.incidentForm.get(controlName)?.setValue(null, { emitEvent: false });
      return;
    }

    if (value.length > 2) {
      value = value.slice(0, 2);
    }

    let numericValue = parseInt(value, 10);

    if (isNaN(numericValue)) {
      input.value = '';
      this.incidentForm.get(controlName)?.setValue(null, { emitEvent: false });
      return;
    }

    if (numericValue > maxValue) {
      numericValue = maxValue;
      value = maxValue.toString();
    }

    if (numericValue < 0) {
      numericValue = 0;
      value = '0';
    }

    input.value = value;
    this.incidentForm.get(controlName)?.setValue(numericValue, { emitEvent: false });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (
      ['Backspace', 'Tab', 'End', 'Home', 'ArrowLeft', 'ArrowRight', 'Delete'].includes(event.key) ||
      (event.key >= '0' && event.key <= '9')
    ) {
      return;
    }
    event.preventDefault();
  }
}