// src/app/pages/modals/diffusion-list/diffusion-list.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit, Input, Output, EventEmitter, OnDestroy, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NotificationService } from '../../../services/notification/notification.service';
import { DiffusionListService, DiffusionListItem, DiffusionListState, SortState } from '../../../services/diffusion-list/diffusion-list.service';
import { AppConfigService } from '../../../services/app-config/app-config.service';
import { GravityLevel, GRAVITY_CONFIG } from '../../../models/incident.model';

@Component({
  selector: 'app-diffusion-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './diffusion-list.html',
  styleUrls: ['./diffusion-list.scss']
})
export class DiffusionListComponent implements OnInit, OnDestroy, OnChanges {

  // ===== INPUTS/OUTPUTS =====
  @Input() isVisible = false;
  @Output() close = new EventEmitter<void>();

  // ===== PROPRIÉTÉS PUBLIQUES (ÉTAT GÉRÉ PAR LE SERVICE) =====
  validatorList: DiffusionListItem | null = null;
  originalValidatorList: DiffusionListItem | null = null;
  currentRules: DiffusionListItem[] = [];
  filteredRules: DiffusionListItem[] = [];
  isLoading = false;
  hasChanges = false;
  searchTerm = '';
  sortState: SortState = {
    currentSort: 'default',
    nameDirection: 'asc',
    dateDirection: 'desc',
    gravityDirection: 'desc'
  };
  newListsBeingEdited = new Set<string | number>();

  // ===== PROPRIÉTÉS UI =====
  showAddMenu = false;
  typeFilter: 'all' | 'metier' | 'personnelle' = 'all';

  // ===== CONFIGURATION =====
  public readonly gravityConfig = GRAVITY_CONFIG;

  // ===== PROPRIÉTÉS PRIVÉES =====
  private readonly destroy$ = new Subject<void>();

  // ===== CONSTRUCTOR =====
  constructor(
    private notificationService: NotificationService,
    private diffusionListService: DiffusionListService,
    private appConfigService: AppConfigService
  ) { }

  // ===== GETTERS =====
  get gravityOptions() {
    return this.appConfigService.getGravityLevels();
  }

  get domainOptions() {
    return this.appConfigService.getDomains();
  }

  get siteOptions() {
    return this.appConfigService.getSites();
  }

  get column1Sites() {
    const sites = this.siteOptions;
    return [
      sites.find(s => s.label.includes('PAJEMPLOI')),
      sites.find(s => s.label.includes('CNV'))
    ].filter(site => !!site);
  }

  get column2Sites() {
    const sites = this.siteOptions;
    return [
      sites.find(s => s.label.includes('Clermont')),
      sites.find(s => s.label.includes('Moulins'))
    ].filter(site => !!site);
  }

  get column3Sites() {
    const sites = this.siteOptions;
    return [
      sites.find(s => s.label.includes('Aurillac')),
      sites.find(s => s.label.includes('Puy'))
    ].filter(site => !!site);
  }

  // ===== LIFECYCLE HOOKS =====
  ngOnInit(): void {
    this.diffusionListService.state$
      .pipe(takeUntil(this.destroy$))
      .subscribe((state: DiffusionListState) => {
        this.currentRules = state.lists;
        this.filteredRules = state.filteredLists;
        this.isLoading = state.isLoading;
        this.hasChanges = state.hasChanges;
        this.searchTerm = state.searchTerm;
        this.sortState = state.sortState;
        this.newListsBeingEdited = state.newListsBeingEdited;
        this.typeFilter = state.typeFilter || 'all';
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isVisible'] && changes['isVisible'].currentValue === true) {
      this.loadCurrentRules();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===== EVENT LISTENERS =====
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) {
      this.showAddMenu = false;
    }
  }

  // ===== MÉTHODES PUBLIQUES - RECHERCHE ET FILTRAGE =====
  onSearchChange(searchTerm: string): void {
    this.diffusionListService.updateSearchTerm(searchTerm);
  }

  onTypeFilterChange(type: string): void {
    this.typeFilter = type as 'all' | 'metier' | 'personnelle';
    this.diffusionListService.updateTypeFilter(this.typeFilter);
  }

  clearFilters(): void {
    this.typeFilter = 'all';
    this.searchTerm = '';
    this.diffusionListService.clearAllFilters();
  }

  // ===== MÉTHODES PUBLIQUES - TRI =====
  sortByName(): void {
    this.diffusionListService.sortByName();
  }

  sortByCreationDate(): void {
    this.diffusionListService.sortByCreationDate();
  }

  sortByGravity(): void {
    this.diffusionListService.sortByGravity();
  }

  resetSort(): void {
    this.diffusionListService.resetSort();
  }

  // ===== MÉTHODES PUBLIQUES - SITES =====
  getAuvergneSites() {
    return this.appConfigService.getSitesByRegion('auvergne');
  }

  getNationalSites() {
    return this.appConfigService.getSitesByRegion('national');
  }

  onSiteChange(rule: DiffusionListItem, siteValue: string, event: any): void {
    const checked = event.target.checked;
    this.diffusionListService.updateSites(rule.id, siteValue, checked);
  }

  // ===== MÉTHODES PUBLIQUES - GESTION DES LISTES =====
  addNewRule(type: 'metier' | 'personnelle' = 'metier'): void {
    this.showAddMenu = false;
    this.diffusionListService.addNewList(type);
  }

  deleteRule(ruleToDelete: DiffusionListItem): void {
    this.diffusionListService.markForDeletion(ruleToDelete.id);
  }

  undoDeleteRule(ruleToUndo: DiffusionListItem): void {
    this.diffusionListService.undoDeleteList(ruleToUndo.id);
  }

  toggleAddMenu(): void {
    this.showAddMenu = !this.showAddMenu;
  }

  // ===== MÉTHODES PUBLIQUES - MISE À JOUR =====
  updateRuleName(rule: DiffusionListItem, newName: string): void {
    this.diffusionListService.updateListData(rule.id, { name: newName });
  }

  updateRuleGravity(rule: DiffusionListItem, newGravity: GravityLevel): void {
    this.diffusionListService.updateListData(rule.id, { gravite: newGravity });
  }

  updateRuleActif(rule: DiffusionListItem, actif: boolean): void {
    this.diffusionListService.updateListData(rule.id, { actif });
  }

  updateRuleAutoInclude(rule: DiffusionListItem, autoInclude: boolean): void {
    this.diffusionListService.updateListData(rule.id, {
      auto_include_service_users: autoInclude
    });
  }

  onDomainChange(rule: DiffusionListItem, domainValue: string, event: any): void {
    const checked = event.target.checked;
    this.diffusionListService.updateDomains(rule.id, domainValue, checked);
  }

  // ===== MÉTHODES PUBLIQUES - EMAILS =====
  addEmailToRule(rule: DiffusionListItem, event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      const input = event.target as HTMLInputElement;
      const email = input.value.trim();

      if (email) {
        const result = this.diffusionListService.addEmailToList(rule.id, email);

        if (result.success) {
          input.value = '';
        } else {
          this.notificationService.error('Erreur', result.message);
        }
      }
    }
  }

  removeEmailFromRule(rule: DiffusionListItem, emailIndex: number): void {
    const success = this.diffusionListService.removeEmailFromList(rule.id, emailIndex);
    if (!success) {
      this.notificationService.error('Erreur', 'Impossible de supprimer cet email');
    }
  }

  // ===== MÉTHODES PUBLIQUES - ACTIONS =====

  // --- Gestion de la liste des validateurs ---
  addEmailToValidatorList(event: KeyboardEvent): void {
    if (event.key === 'Enter' && this.validatorList) {
      event.preventDefault();
      const input = event.target as HTMLInputElement;
      const email = input.value.trim();
      if (email) {
        if (this.validatorList.emails.includes(email)) {
          this.notificationService.error('Erreur', 'Cet email est déjà dans la liste des validateurs.');
          return;
        }
        this.validatorList.emails = [...this.validatorList.emails, email];
        input.value = '';
        this.hasChanges = true; // Marquer qu'il y a des changements
      }
    }
  }

  removeEmailFromValidatorList(emailIndex: number): void {
    if (this.validatorList && emailIndex >= 0) {
      const updatedEmails = [...this.validatorList.emails];
      updatedEmails.splice(emailIndex, 1);
      this.validatorList.emails = updatedEmails;
      this.hasChanges = true; // Marquer qu'il y a des changements
    }
  }

  private validatorListHasChanged(): boolean {
    if (!this.validatorList || !this.originalValidatorList) {
      return false;
    }
    return JSON.stringify(this.validatorList.emails.sort()) !== JSON.stringify(this.originalValidatorList.emails.sort());
  }

  saveChanges(): void {
    if (this.isLoading) return;
    this.isLoading = true;

    const saveOperations: Observable<any>[] = [];

    // Opération pour les listes standard
    const standardListsSave$ = this.diffusionListService.saveAllChanges();
    saveOperations.push(standardListsSave$);

    // Opération pour la liste des validateurs, si elle a changé
    if (this.validatorListHasChanged()) {
      saveOperations.push(this.diffusionListService.updateValidatorList(this.validatorList!.emails));
    }

    forkJoin(saveOperations)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results) => {
          this.isLoading = false;
          const mainSaveResult = results[0];

          if (mainSaveResult.success) {
            this.notificationService.success('Sauvegarde réussie', 'Toutes les modifications ont été enregistrées.');
            this.loadCurrentRules(); // Recharger toutes les données
          } else {
            this.notificationService.error('Erreurs de validation', mainSaveResult.errors.join('\n'));
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Erreur lors de la sauvegarde globale:', error);
          this.notificationService.error('Erreur de sauvegarde', 'Une erreur est survenue lors de la sauvegarde.');
        }
      });
  }

  closeModal(): void {
    if (this.hasChanges) {
      const confirmed = confirm('Vous avez des modifications non sauvegardées. Voulez-vous vraiment fermer ?');
      if (!confirmed) return;
    }
    this.close.emit();
  }

  // ===== MÉTHODES PUBLIQUES - TRACKING =====
  trackByRuleId(index: number, rule: DiffusionListItem): any {
    return rule.id || `temp-${index}`;
  }

  trackByEmail(index: number, email: string): string {
    return `${email}-${index}`;
  }

  // ===== MÉTHODES PRIVÉES =====
  private loadCurrentRules(): void {
    const allLists$ = this.diffusionListService.loadLists();
    const validatorList$ = this.diffusionListService.getValidatorList();

    forkJoin([allLists$, validatorList$])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ([_, validatorList]) => {
          this.validatorList = validatorList;
          this.originalValidatorList = JSON.parse(JSON.stringify(validatorList)); // Copie profonde pour l'original
        },
        error: (error) => {
          console.error('Erreur de chargement:', error);
          this.notificationService.error(
            'Erreur de chargement',
            'Impossible de récupérer les listes depuis le serveur.'
          );
        }
      });
  }

}