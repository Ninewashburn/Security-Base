// src/app/services/data-filtering/data-filtering.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AdvancedFilters, ActiveFilter, FilterState } from '../../interfaces/filter-config';
import { Incident } from '../../models/incident.model';
import { AppConfigService } from '../app-config/app-config.service';

@Injectable({
  providedIn: 'root'
})
export class DataFilteringService {

  private initialFilterState: FilterState = {
    searchTerm: '',
    advancedFilters: {
      id: '',
      object: '',
      domain: '',
      gravity: '',
      status: '',
      siteImpacte: '',
      redacteur_id: null,
      intervenant_id: null,
      dateFrom: '',
      dateTo: ''
    },
    showAdvancedFilters: false
  };

  private filterStateSubject = new BehaviorSubject<FilterState>({ ...this.initialFilterState });
  filterState$ = this.filterStateSubject.asObservable();

  constructor(private appConfigService: AppConfigService) { }

  get currentState(): FilterState {
    return this.filterStateSubject.value;
  }

  get searchTerm(): string {
    return this.currentState.searchTerm;
  }

  get advancedFilters(): AdvancedFilters {
    return this.currentState.advancedFilters;
  }

  get showAdvancedFilters(): boolean {
    return this.currentState.showAdvancedFilters;
  }

  setFilterState(partialState: Partial<FilterState>): void {
    const currentState = this.currentState;
    this.filterStateSubject.next({
      ...currentState,
      ...partialState
    });
  }

  setSearchTerm(searchTerm: string): void {
    const currentState = this.currentState;
    this.filterStateSubject.next({
      ...currentState,
      searchTerm
    });
  }

  clearSearch(): void {
    this.setSearchTerm('');
  }

  setAdvancedFilter(key: keyof AdvancedFilters, value: string | number | null): void {
    const currentState = this.currentState;
    const updatedFilters = {
      ...currentState.advancedFilters,
      [key]: value
    };

    this.filterStateSubject.next({
      ...currentState,
      advancedFilters: updatedFilters,
      searchTerm: ''
    });
  }

  setAdvancedFilters(filters: Partial<AdvancedFilters>): void {
    const currentState = this.currentState;
    const updatedFilters = {
      ...currentState.advancedFilters,
      ...filters
    };

    this.filterStateSubject.next({
      ...currentState,
      advancedFilters: updatedFilters,
      searchTerm: ''
    });
  }

  resetAdvancedFilters(): void {
    const currentState = this.currentState;
    this.filterStateSubject.next({
      ...currentState,
      advancedFilters: { ...this.initialFilterState.advancedFilters },
      searchTerm: ''
    });
  }

  toggleAdvancedFilters(): void {
    const currentState = this.currentState;
    this.filterStateSubject.next({
      ...currentState,
      showAdvancedFilters: !currentState.showAdvancedFilters
    });
  }

  clearAllFilters(): void {
    this.filterStateSubject.next({ ...this.initialFilterState });
  }

  hasActiveFilters(): boolean {
    const state = this.currentState;

    if (state.searchTerm.trim()) {
      return true;
    }

    // Check for advanced filters
    // Iterate over the keys of advancedFilters and check their values
    for (const key in state.advancedFilters) {
      if (Object.prototype.hasOwnProperty.call(state.advancedFilters, key)) {
        const value = state.advancedFilters[key as keyof AdvancedFilters];
        if (typeof value === 'string' && value.trim() !== '') {
          return true;
        }
        // For number types (redacteur_id, intervenant_id), check if they are not null/undefined
        if (typeof value === 'number' && value != null) {
          return true;
        }
      }
    }

    return false;
  }

  getActiveFilters(): ActiveFilter[] {
    const activeFilters: ActiveFilter[] = [];
    const state = this.currentState;

    if (state.searchTerm.trim()) {
      activeFilters.push({
        label: 'Recherche',
        value: state.searchTerm,
        type: 'search'
      });
    }

    if (state.advancedFilters.id.trim()) {
      activeFilters.push({
        label: 'ID',
        value: state.advancedFilters.id,
        type: 'filter',
        key: 'id'
      });
    }

    if (state.advancedFilters.object.trim()) {
      activeFilters.push({
        label: 'Objet',
        value: state.advancedFilters.object,
        type: 'filter',
        key: 'object'
      });
    }

    if (state.advancedFilters.domain) {
      const domain = this.appConfigService.findDomain(state.advancedFilters.domain);
      const domainLabel = domain?.label || state.advancedFilters.domain;

      activeFilters.push({
        label: 'Domaine',
        value: domainLabel,
        type: 'filter',
        key: 'domain'
      });
    }

    if (state.advancedFilters.gravity) {
      const gravity = this.appConfigService.findGravity(state.advancedFilters.gravity as any);
      const gravityLabel = gravity?.label || state.advancedFilters.gravity;

      activeFilters.push({
        label: 'Gravité',
        value: gravityLabel,
        type: 'filter',
        key: 'gravity'
      });
    }

    if (state.advancedFilters.status) {
      const status = this.appConfigService.findStatus(state.advancedFilters.status as any);
      const statusLabel = status?.label || state.advancedFilters.status;

      activeFilters.push({
        label: 'Statut',
        value: statusLabel,
        type: 'filter',
        key: 'status'
      });
    }

    if (state.advancedFilters.siteImpacte.trim()) {
      const siteImpacte = this.appConfigService.findSite(state.advancedFilters.siteImpacte);
      const siteLabel = siteImpacte?.shortLabel || state.advancedFilters.siteImpacte;

      activeFilters.push({
        label: 'Site Impacté',
        value: siteLabel,
        type: 'filter',
        key: 'siteImpacte'
      });
    }

    if (state.advancedFilters.redacteur_id !== null && state.advancedFilters.redacteur_id !== undefined) {
      activeFilters.push({
        label: 'Rédacteur',
        value: state.advancedFilters.redacteur_id.toString(), // Convert number to string for display
        type: 'filter',
        key: 'redacteur_id'
      });
    }

    if (state.advancedFilters.intervenant_id != null) {
      activeFilters.push({
        label: 'Intervenant',
        value: state.advancedFilters.intervenant_id.toString(),
        type: 'filter',
        key: 'intervenant_id'
      });
    }
    if (state.advancedFilters.dateFrom) {
      const formattedDate = this.formatDateForDisplay(state.advancedFilters.dateFrom);
      activeFilters.push({
        label: 'Du',
        value: formattedDate,
        type: 'filter',
        key: 'dateFrom'
      });
    }

    if (state.advancedFilters.dateTo) {
      const formattedDate = this.formatDateForDisplay(state.advancedFilters.dateTo);
      activeFilters.push({
        label: 'Au',
        value: formattedDate,
        type: 'filter',
        key: 'dateTo'
      });
    }

    return activeFilters;
  }

  removeFilter(filterKey: string, filterType: 'search' | 'filter'): void {
    if (filterType === 'search') {
      this.clearSearch();
    } else {
      // Gestion spécifique par clé de filtre
      switch (filterKey) {
        case 'dateFrom':
        case 'dateTo':
          this.setAdvancedFilter(filterKey, '');
          break;
        case 'redacteur_id':
        case 'intervenant_id':
          this.setAdvancedFilter(filterKey, null);
          break;
        default:
          this.setAdvancedFilter(filterKey as keyof AdvancedFilters, '');
          break;
      }
    }
  }
  applyFilters(incidents: Incident[]): Incident[] {
    const state = this.currentState;
    let filteredIncidents = [...incidents];

    if (state.searchTerm.trim()) {
      filteredIncidents = this.applyLocalSearch(filteredIncidents, state.searchTerm);
    }

    filteredIncidents = this.applyLocalFilters(filteredIncidents, state.advancedFilters);

    return filteredIncidents;
  }

  private applyLocalSearch(incidents: Incident[], searchTerm: string): Incident[] {
    if (!searchTerm.trim()) {
      return incidents;
    }

    const searchLower = searchTerm.toLowerCase().trim();

    return incidents.filter(incident => {
      // Barre de recherche simple
      if (incident.id.toString().includes(searchLower)) return true;
      if (incident.object.toLowerCase().includes(searchLower)) return true;
      if (incident.redacteur_id?.toString().includes(searchLower)) return true;
      if (incident.creator?.full_name?.toLowerCase().includes(searchLower)) return true;
      if (incident.intervenant_id && incident.intervenant_id.toString().includes(searchLower)) return true;
      if (incident.assignee?.full_name?.toLowerCase().includes(searchLower)) return true;
      if (incident.ticketNumber && incident.ticketNumber.toLowerCase().includes(searchLower)) return true;
      if (incident.domains && incident.domains.some(d => d.toLowerCase().includes(searchLower))) return true;
      if (incident.sitesImpactes && incident.sitesImpactes.some(s => s.toLowerCase().includes(searchLower))) return true;
      const gravityLabel = this.appConfigService.findGravity(incident.gravity)?.label;
      if (gravityLabel && gravityLabel.toLowerCase().includes(searchLower)) return true;
      const statusLabel = this.appConfigService.findStatus(incident.status)?.label;
      if (statusLabel && statusLabel.toLowerCase().includes(searchLower)) return true;
      if (incident.dateOuverture && new Date(incident.dateOuverture).toLocaleDateString('fr-FR').includes(searchLower)) return true;
      if (incident.dateCloture && new Date(incident.dateCloture).toLocaleDateString('fr-FR').includes(searchLower)) return true;
      if (incident.isNational && ('oui'.includes(searchLower) || 'national'.includes(searchLower))) return true;
      if (incident.has_pending_actions && 'oui'.includes(searchLower)) return true;
      if (!incident.has_pending_actions && 'non'.includes(searchLower)) return true;

      return false;
    });
  }

  private applyLocalFilters(incidents: Incident[], filters: AdvancedFilters): Incident[] {
    let filtered = [...incidents];

    if (filters.id.trim()) {
      filtered = filtered.filter(incident =>
        incident.id.toString().includes(filters.id.trim())
      );
    }

    if (filters.object.trim()) {
      filtered = filtered.filter(incident =>
        incident.object.toLowerCase().includes(filters.object.toLowerCase().trim())
      );
    }

    if (filters.domain) {
      filtered = filtered.filter(incident =>
        incident.domains.includes(filters.domain)
      );
    }

    if (filters.gravity) {
      filtered = filtered.filter(incident =>
        incident.gravity === filters.gravity
      );
    }

    if (filters.status && filters.status !== 'archive') {
      filtered = filtered.filter(incident =>
        incident.status === filters.status
      );
    }

    if (filters.siteImpacte.trim()) {
      const searchTerm = filters.siteImpacte.toLowerCase().trim();
      filtered = filtered.filter(incident => {
        // Recherche UNIQUEMENT dans sitesImpactes
        if (incident.sitesImpactes && incident.sitesImpactes.length > 0) {
          return incident.sitesImpactes.some(siteValue => {
            // Recherche directe dans la valeur
            if (siteValue.toLowerCase().includes(searchTerm)) {
              return true;
            }

            // Recherche avec AppConfig pour les labels
            const siteImpacte = this.appConfigService.findSite(siteValue);
            return (siteImpacte?.label?.toLowerCase().includes(searchTerm) ?? false) ||
              (siteImpacte?.shortLabel?.toLowerCase().includes(searchTerm) ?? false);
          });
        }
        return false;
      });
    }

    if (filters.dateFrom || filters.dateTo) {
      filtered = filtered.filter(incident => {
        const incidentDate = incident.dateOuverture;
        if (!incidentDate) return false;

        // Conversion de la date d'incident au format YYYY-MM-DD pour comparaison
        const incidentDateOnly = new Date(incidentDate).toISOString().split('T')[0];

        // Vérification date de début
        const afterStartDate = !filters.dateFrom || incidentDateOnly >= filters.dateFrom;

        // Vérification date de fin
        const beforeEndDate = !filters.dateTo || incidentDateOnly <= filters.dateTo;

        return afterStartDate && beforeEndDate;
      });
    }

    if (filters.redacteur_id !== null && filters.redacteur_id !== undefined) {
      filtered = filtered.filter(incident => {
        if (typeof filters.redacteur_id === 'number') {
          return incident.redacteur_id === filters.redacteur_id;
        } else if (typeof filters.redacteur_id === 'string') {
          const searchLower = filters.redacteur_id.toLowerCase().trim();
          return incident.creator?.full_name?.toLowerCase().includes(searchLower);
        }
        return false;
      });
    }

    if (filters.intervenant_id != null) {
      filtered = filtered.filter(incident => {
        if (typeof filters.intervenant_id === 'number') {
          return incident.intervenant_id === filters.intervenant_id;
        } else if (typeof filters.intervenant_id === 'string') {
          const searchLower = filters.intervenant_id.toLowerCase().trim();
          return incident.assignee?.full_name?.toLowerCase().includes(searchLower);
        }
        return false;
      });
    }

    return filtered;
  }

  getFilterDisplayValue(type: 'domain' | 'gravity' | 'status' | 'siteImpacte', value: string): string {
    switch (type) {
      case 'domain':
        const domain = this.appConfigService.findDomain(value);
        return domain?.shortLabel ?? value;

      case 'gravity':
        const gravity = this.appConfigService.findGravity(value as any);
        return gravity?.label ?? value;

      case 'status':
        const status = this.appConfigService.findStatus(value as any);
        return status?.label ?? value;

      case 'siteImpacte':
        const siteImpacte = this.appConfigService.findSite(value);
        return siteImpacte?.shortLabel ?? value;

      default:
        return value;
    }
  }

  countByStatus(incidents: Incident[], status: string): number {
    return incidents.filter(incident => incident.status === status).length;
  }

  private formatDateForDisplay(dateString: string): string {
    if (!dateString) return '';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString; // Fallback si erreur de parsing
    }
  }
}