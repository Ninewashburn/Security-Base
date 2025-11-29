// src/app/services/diffusion-list/diffusion-list.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError, forkJoin } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { GravityLevel } from '../../models/incident.model';

export interface DiffusionListItem {
  id?: number;
  name: string;
  type?: 'metier' | 'personnelle';
  gravite?: GravityLevel;
  domains?: string[];
  sites?: string[];
  emails: string[];
  service_id?: number;
  description?: string;
  actif?: boolean;
  auto_include_service_users?: boolean;
  isNew?: boolean;
  isDeleted?: boolean;
}

export type SortDirection = 'asc' | 'desc';
export type SortType = 'default' | 'name' | 'date' | 'gravity';
export type TypeFilter = 'all' | 'metier' | 'personnelle';

export interface SortState {
  currentSort: SortType;
  nameDirection: SortDirection;
  dateDirection: SortDirection;
  gravityDirection: SortDirection;
}

export interface DiffusionListState {
  lists: DiffusionListItem[];
  originalLists: DiffusionListItem[];
  filteredLists: DiffusionListItem[];
  isLoading: boolean;
  hasChanges: boolean;
  searchTerm: string;
  typeFilter: TypeFilter;
  sortState: SortState;
  newListsBeingEdited: Set<string | number>;
}

@Injectable({
  providedIn: 'root'
})
export class DiffusionListService {
  private readonly apiUrl = `${environment.apiUrl}/diffusion-lists`;

  private readonly initialState: DiffusionListState = {
    lists: [],
    originalLists: [],
    filteredLists: [],
    isLoading: false,
    hasChanges: false,
    searchTerm: '',
    typeFilter: 'all',
    sortState: {
      currentSort: 'default',
      nameDirection: 'asc',
      dateDirection: 'desc',
      gravityDirection: 'desc'
    },
    newListsBeingEdited: new Set<string | number>()
  };

  private readonly _state = new BehaviorSubject<DiffusionListState>(this.initialState);
  readonly state$ = this._state.asObservable();

  constructor(private http: HttpClient) { }

  // ===== GESTION DE L'ÉTAT INTERNE =====
  private getState(): DiffusionListState {
    return this._state.getValue();
  }

  private setState(newState: Partial<DiffusionListState>): void {
    const currentState = this.getState();
    const updatedState = { ...currentState, ...newState };

    // Auto-application du filtrage et tri à chaque changement d'état
    if (newState.lists || newState.searchTerm !== undefined || newState.sortState || newState.typeFilter !== undefined) {
      updatedState.filteredLists = this.applyFilteringAndSorting(
        updatedState.lists,
        updatedState.searchTerm,
        updatedState.typeFilter,
        updatedState.sortState,
        updatedState.newListsBeingEdited
      );
    }

    this._state.next(updatedState);
  }

  // ===== CHARGEMENT DES DONNÉES  =====
  loadLists(): Observable<any> {
    this.setState({ isLoading: true });
    return this.http.get<any>(this.apiUrl).pipe(
      tap(response => {
        const lists = response.data.map((rule: any) => ({
          ...rule,
          emails: this.parseEmailsArray(rule.emails),
          domains: this.parseDomainsArray(rule.domains),
          sites: this.parseSitesArray(rule.sites),
          type: rule.type // Pas de valeur par défaut ici
        }));
        this.setState({
          lists,
          originalLists: JSON.parse(JSON.stringify(lists)),
          isLoading: false,
          hasChanges: false
        });
      }),
      catchError(err => {
        this.setState({ isLoading: false });
        return throwError(() => err);
      })
    );
  }

  /**
   * Récupère uniquement les listes de type "personnelle (personnalisée)"
   */
  getLists(type: 'personnelle'): Observable<{ success: boolean, data: DiffusionListItem[] }> {
    return this.http.get<{ data: DiffusionListItem[] }>(`${this.apiUrl}?type=${type}`).pipe(
      map(response => ({ success: true, data: response.data }))
    );
  }

  // ===== GESTION DE LA RECHERCHE ET FILTRAGE =====
  updateSearchTerm(term: string): void {
    this.setState({ searchTerm: term });
  }

  updateTypeFilter(type: TypeFilter): void {
    this.setState({ typeFilter: type });
  }

  clearAllFilters(): void {
    this.setState({ 
      searchTerm: '', 
      typeFilter: 'all' 
    });
  }

  // ===== GESTION DU TRI =====
  sortByName(): void {
    const state = this.getState();
    const newDirection: SortDirection = state.sortState.nameDirection === 'asc' ? 'desc' : 'asc';
    this.setState({
      sortState: {
        ...state.sortState,
        currentSort: 'name',
        nameDirection: newDirection
      }
    });
  }

  sortByCreationDate(): void {
    const state = this.getState();
    const newDirection: SortDirection = state.sortState.dateDirection === 'desc' ? 'asc' : 'desc';
    this.setState({
      sortState: {
        ...state.sortState,
        currentSort: 'date',
        dateDirection: newDirection
      }
    });
  }

  sortByGravity(): void {
    const state = this.getState();
    const newDirection: SortDirection = state.sortState.gravityDirection === 'desc' ? 'asc' : 'desc';
    this.setState({
      sortState: {
        ...state.sortState,
        currentSort: 'gravity',
        gravityDirection: newDirection
      }
    });
  }

  resetSort(): void {
    this.setState({
      sortState: {
        currentSort: 'default',
        nameDirection: 'asc',
        dateDirection: 'desc',
        gravityDirection: 'desc'
      }
    });
  }

  // ===== LOGIQUE DE FILTRAGE ET TRI CENTRALISÉE =====
  private applyFilteringAndSorting(
    lists: DiffusionListItem[],
    searchTerm: string,
    typeFilter: TypeFilter,
    sortState: SortState,
    newListsBeingEdited: Set<string | number>
  ): DiffusionListItem[] {
    let filtered = this.applyFiltering(lists, searchTerm, typeFilter);
    filtered = this.applySorting(filtered, sortState, newListsBeingEdited);
    return filtered;
  }

  private applyFiltering(lists: DiffusionListItem[], searchTerm: string, typeFilter: TypeFilter): DiffusionListItem[] {
    let filtered = [...lists];

    // Filtrage par terme de recherche
    if (searchTerm) {
      filtered = filtered.filter(rule =>
        rule.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrage par type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(rule => 
        (rule.type || 'metier') === typeFilter
      );
    }

    return filtered;
  }

  private applySorting(
    lists: DiffusionListItem[],
    sortState: SortState,
    newListsBeingEdited: Set<string | number>
  ): DiffusionListItem[] {
    let sorted = [...lists];

    switch (sortState.currentSort) {
      case 'name':
        sorted.sort((a, b) => {
          const comparison = a.name.localeCompare(b.name);
          return sortState.nameDirection === 'desc' ? -comparison : comparison;
        });
        break;

      case 'date':
        sorted.sort((a, b) => {
          if (!a.id && b.id) return -1;
          if (a.id && !b.id) return 1;
          if (!a.id && !b.id) return 0;
          const comparison = (a.id || 0) - (b.id || 0);
          return sortState.dateDirection === 'desc' ? -comparison : comparison;
        });
        break;

      case 'gravity':
        sorted.sort((a, b) => {
          const gravityOrder = ['faible', 'moyen', 'grave', 'tres_grave'];
          const aIndex = a.gravite ? gravityOrder.indexOf(a.gravite) : -1;
          const bIndex = b.gravite ? gravityOrder.indexOf(b.gravite) : -1;

          // Les items sans gravité vont à la fin
          if (aIndex === -1 && bIndex !== -1) return 1;
          if (aIndex !== -1 && bIndex === -1) return -1;
          if (aIndex === -1 && bIndex === -1) return 0;

          const comparison = aIndex - bIndex;
          return sortState.gravityDirection === 'desc' ? -comparison : comparison;
        });
        break;

      default:
        sorted.sort((a, b) => {
          const aBeingEdited = this.isListBeingEdited(a, newListsBeingEdited);
          const bBeingEdited = this.isListBeingEdited(b, newListsBeingEdited);

          if (aBeingEdited && !bBeingEdited) return -1;
          if (!aBeingEdited && bBeingEdited) return 1;
          if (a.isNew && !b.isNew) return -1;
          if (!a.isNew && b.isNew) return 1;

          return (b.id || 0) - (a.id || 0);
        });
        break;
    }

    return sorted;
  }

  // ===== GESTION DES LISTES EN COURS D'ÉDITION =====
  private isListBeingEdited(rule: DiffusionListItem, newListsBeingEdited: Set<string | number>): boolean {
    return rule.id !== undefined && newListsBeingEdited.has(rule.id);
  }

  markListAsBeingEdited(id: string | number | undefined): void {
    if (id === undefined) return;
    const state = this.getState();
    const newSet = new Set(state.newListsBeingEdited);
    newSet.add(id);
    this.setState({ newListsBeingEdited: newSet });
  }

  clearAllEditingMarks(): void {
    this.setState({ newListsBeingEdited: new Set() });
  }

  // ===== GESTION DES RÈGLES =====
  addNewList(type: 'metier' | 'personnelle' = 'metier'): void {
    const state = this.getState();
    const newListId = (state.lists.length + 1) * -1;
    
    // Configuration différenciée selon le type
    const newList: DiffusionListItem = {
      id: newListId,
      name: `Nouvelle liste ${type === 'metier' ? 'métier' : 'personnalisée'} ${state.lists.length + 1}`,
      type: type, // Assurer que le type est explicitement défini
      gravite: type === 'metier' ? 'faible' : undefined, // Gravité uniquement pour métier
      domains: type === 'metier' ? [] : [], // Laisser vide mais défini
      sites: type === 'metier' ? [] : [], // Laisser vide mais défini  
      emails: [],
      actif: true,
      auto_include_service_users: type === 'metier' ? false : undefined, // Seulement pour métier
      isNew: true
    };

    this.setState({
      lists: [newList, ...state.lists],
      hasChanges: true
    });

    this.markListAsBeingEdited(newListId);

    setTimeout(() => {
      this.updateListData(newList.id, { isNew: false });
    }, 2500);
  }

  markForDeletion(id?: number): void {
    if (!id) return;
    this.updateListData(id, { isDeleted: true });
  }

  undoDeleteList(id?: number): void {
    if (!id) return;
    this.updateListData(id, { isDeleted: false });
  }

  // ===== MISE À JOUR DES DONNÉES =====
  updateListData(id: number | undefined, data: Partial<DiffusionListItem>): void {
    if (id === undefined) return;
    const state = this.getState();
    const lists = state.lists.map(l => l.id === id ? { ...l, ...data } : l);
    this.setState({ lists, hasChanges: true });
  }

  // ===== GESTION DES DOMAINES =====
  updateDomains(id: number | undefined, domain: string, checked: boolean): void {
    if (id === undefined) return;
    const state = this.getState();
    const lists = state.lists.map(list => {
      if (list.id === id) {
        const domains = list.domains ? [...list.domains] : [];
        const index = domains.indexOf(domain);
        if (checked && index === -1) {
          domains.push(domain);
        } else if (!checked && index > -1) {
          domains.splice(index, 1);
        }
        return { ...list, domains };
      }
      return list;
    });
    this.setState({ lists, hasChanges: true });
  }

  // ===== GESTION DES SITES =====
  updateSites(id: number | undefined, siteValue: string, checked: boolean): void {
    if (id === undefined) return;
    const state = this.getState();
    const lists = state.lists.map(list => {
      if (list.id === id) {
        const sites = list.sites ? [...list.sites] : [];
        const index = sites.indexOf(siteValue);
        if (checked && index === -1) {
          sites.push(siteValue);
        } else if (!checked && index > -1) {
          sites.splice(index, 1);
        }
        return { ...list, sites };
      }
      return list;
    });
    this.setState({ lists, hasChanges: true });
  }

  // ===== GESTION DES EMAILS =====
  addEmailToList(id: number | undefined, email: string): { success: boolean; message?: string } {
    if (id === undefined) return { success: false, message: 'ID non défini' };

    const validationResult = this.validateEmail(email);
    if (!validationResult.isValid) {
      return { success: false, message: validationResult.message };
    }

    const state = this.getState();
    const targetList = state.lists.find(l => l.id === id);
    if (!targetList) {
      return { success: false, message: 'Liste non trouvée' };
    }

    if (targetList.emails.includes(email)) {
      return { success: false, message: 'Email déjà dans la liste' };
    }

    const updatedEmails = [...targetList.emails, email];
    this.updateListData(id, { emails: updatedEmails });
    return { success: true };
  }

  removeEmailFromList(id: number | undefined, emailIndex: number): boolean {
    if (id === undefined) return false;
    const state = this.getState();
    const targetList = state.lists.find(l => l.id === id);
    if (!targetList || emailIndex < 0 || emailIndex >= targetList.emails.length) {
      return false;
    }
    const updatedEmails = [...targetList.emails];
    updatedEmails.splice(emailIndex, 1);
    this.updateListData(id, { emails: updatedEmails });
    return true;
  }

  // ===== VALIDATION =====
  private validateEmail(email: string): { isValid: boolean; message?: string } {
    if (!email || !email.trim()) {
      return { isValid: false, message: 'Email vide non autorisé' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return { isValid: false, message: 'Format d\'email invalide' };
    }
    return { isValid: true };
  }

  private validateCurrentRules(rules: DiffusionListItem[]): string[] {
    const errors: string[] = [];
    rules.forEach((rule, index) => {
      if (rule.isDeleted) return;
      
      if (!rule.name || !rule.name.trim()) {
        errors.push(`Liste ${index + 1}: Le nom est obligatoire`);
      }

      // Validation conditionnelle stricte selon le type
      if (rule.type === 'metier') {
        if (!rule.gravite) {
          errors.push(`Liste ${index + 1}: La gravité est obligatoire pour les listes métier`);
        }
      }
      // Pour les listes personnelles (personnalisée), pas de validation de gravité

      rule.emails.forEach((email, emailIndex) => {
        const validation = this.validateEmail(email);
        if (!validation.isValid) {
          errors.push(`Liste ${index + 1}, Email ${emailIndex + 1}: ${validation.message}`);
        }
      });
    });
    return errors;
  }

  // ===== SAUVEGARDE =====
  saveAllChanges(): Observable<{ success: boolean; errors: string[]; message?: string }> {
    const state = this.getState();
    const validationErrors = this.validateCurrentRules(state.lists);
    if (validationErrors.length > 0) {
      return of({ success: false, errors: validationErrors });
    }

    const operations = this.buildSaveOperations(state);
    if (operations.length === 0) {
      return of({
        success: true,
        errors: [],
        message: 'Aucune modification à sauvegarder'
      });
    }

    this.setState({ isLoading: true });

    return forkJoin(operations).pipe(
      map(results => {
        const errorMessages = results
          .filter(res => res && res.error)
          .map(res => res.message);
        return {
          success: errorMessages.length === 0,
          errors: errorMessages
        };
      }),
      tap((result) => {
        this.setState({ isLoading: false });
        if (result.success) {
          this.clearAllEditingMarks();
          this.loadLists().subscribe();
        }
      }),
      catchError(() => {
        this.setState({ isLoading: false });
        return of({
          success: false,
          errors: ['Une erreur serveur globale est survenue']
        });
      })
    );
  }

  // ===== CONSTRUCTION DES OPÉRATIONS DE SAUVEGARDE =====
  private buildSaveOperations(state: DiffusionListState): Observable<any>[] {
    const observables: Observable<any>[] = [];

    // Suppressions
    state.lists
      .filter(rule => rule.isDeleted && rule.id && rule.id > 0)
      .forEach(rule => {
        observables.push(
          this.http.delete(`${this.apiUrl}/${rule.id}`).pipe(
            catchError(() => of({
              error: true,
              message: `Erreur suppression: ${rule.name}`
            }))
          )
        );
      });

    // Créations
    state.lists
      .filter(rule => !rule.isDeleted && (!rule.id || rule.id < 0))
      .forEach(current => {
        // Construction explicite pour conserver TOUS les champs
        const listToCreate: any = {
          name: current.name,
          type: current.type, // EXPLICITEMENT inclure le type
          emails: current.emails || [],
          actif: current.actif ?? true,
          description: current.description || null,
          service_id: current.service_id || null
        };
        
        // Données conditionnelles selon le type
        if (current.type === 'metier') {
          listToCreate.gravite = current.gravite;
          listToCreate.domains = current.domains || [];
          listToCreate.sites = current.sites || [];
          listToCreate.auto_include_service_users = current.auto_include_service_users ?? false;
        } else if (current.type === 'personnelle') {
          listToCreate.gravite = null;
          listToCreate.domains = [];
          listToCreate.sites = [];
          listToCreate.auto_include_service_users = false;
        }
        
        observables.push(
          this.http.post(this.apiUrl, listToCreate).pipe(
            catchError((error) => {
              console.error('Erreur création liste:', error);
              return of({
                error: true,
                message: `Erreur création: ${current.name} - ${error.error?.message || error.message}`
              });
            })
          )
        );
      });

    // Modifications
    state.lists
      .filter(rule => !rule.isDeleted && rule.id && rule.id > 0)
      .forEach(current => {
        const original = state.originalLists.find(o => o.id === current.id);
        if (original && this.hasRuleChanged(original, current)) {
          // Construction explicite pour conserver tous les champs
          const listToUpdate: any = {
            id: current.id,
            name: current.name,
            type: current.type, // EXPLICITEMENT inclure le type
            emails: current.emails || [],
            actif: current.actif ?? true,
            description: current.description || null,
            service_id: current.service_id || null
          };
          
          // Données conditionnelles selon le type
          if (current.type === 'metier') {
            listToUpdate.gravite = current.gravite;
            listToUpdate.domains = current.domains || [];
            listToUpdate.sites = current.sites || [];
            listToUpdate.auto_include_service_users = current.auto_include_service_users ?? false;
          } else if (current.type === 'personnelle') {
            listToUpdate.gravite = null;
            listToUpdate.domains = [];
            listToUpdate.sites = [];
            listToUpdate.auto_include_service_users = false;
          }
          
          observables.push(
            this.http.put(`${this.apiUrl}/${current.id}`, listToUpdate).pipe(
              catchError((error) => {
                console.error('Erreur modification liste:', error);
                return of({
                  error: true,
                  message: `Erreur modification: ${current.name} - ${error.error?.message || error.message}`
                });
              })
            )
          );
        }
      });

    return observables;
  }

  // ===== UTILITAIRES INTERNES =====
  private parseEmailsArray(emails: any): string[] {
    if (Array.isArray(emails)) return emails.filter(e => e && e.trim());
    return [];
  }

  private parseDomainsArray(domains: any): string[] {
    if (Array.isArray(domains)) return domains;
    return [];
  }

  private parseSitesArray(sites: any): string[] {
    if (Array.isArray(sites)) return sites;
    if (typeof sites === 'string') {
      try {
        const parsed = JSON.parse(sites);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  private hasRuleChanged(original: DiffusionListItem, current: DiffusionListItem): boolean {
    const normalize = (rule: DiffusionListItem) => ({
      ...rule,
      emails: [...rule.emails].sort(),
      domains: [...(rule.domains || [])].sort(),
      sites: [...(rule.sites || [])].sort()
    });
    return JSON.stringify(normalize(original)) !== JSON.stringify(normalize(current));
  }

  // ===== GESTION SPÉCIFIQUE LISTE VALIDATEURS =====

  getValidatorList(): Observable<DiffusionListItem> {
    return this.http.get<{ data: DiffusionListItem }>(`${environment.apiUrl}/diffusion-list/validator`).pipe(
      map(response => response.data)
    );
  }

  updateValidatorList(emails: string[]): Observable<any> {
    return this.http.put(`${environment.apiUrl}/diffusion-list/validator`, { emails });
  }
}