// src/app/services/data-sorting/data-sorting.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SortState, SortConfig, SortIcons, DEFAULT_SORT_ICONS } from '../../models';
import { Incident, GRAVITY_CONFIG, STATUS_CONFIG } from '../../models/incident.model';

@Injectable({
  providedIn: 'root'
})
export class DataSortingService {

  // ===== CONFIGURATION PAR DÉFAUT =====
  private defaultSortConfig: SortConfig = {
    defaultColumn: 'dateOuverture',
    defaultDirection: 'desc',
    sortableColumns: [
      { key: 'id', sortable: true },
      { key: 'object', sortable: true },
      { key: 'domains', sortable: true },
      { key: 'gravity', sortable: true },
      { key: 'status', sortable: true },
      { key: 'dateOuverture', sortable: true },
      { key: 'dateCloture', sortable: true },
      { key: 'sitesImpactes', sortable: true },
      { key: 'isNational', sortable: true },
      { key: 'ticketNumber', sortable: true },
      { key: 'redacteur_id', sortable: true },
      { key: 'intervenant_id', sortable: true },
      { key: 'has_pending_actions', sortable: true }
    ]
  };

  // ===== ÉTAT RÉACTIF =====
  private sortStateSubject = new BehaviorSubject<SortState>({
    column: this.defaultSortConfig.defaultColumn,
    direction: this.defaultSortConfig.defaultDirection
  });

  // ===== OBSERVABLES PUBLICS =====
  sortState$ = this.sortStateSubject.asObservable();

  // ===== CONFIGURATION DES ICÔNES =====
  private sortIcons: SortIcons = DEFAULT_SORT_ICONS;

  constructor() { }

  // ===== GETTERS =====

  get currentSortState(): SortState {
    return this.sortStateSubject.value;
  }

  get sortColumn(): string {
    return this.currentSortState.column;
  }

  get sortDirection(): 'asc' | 'desc' {
    return this.currentSortState.direction;
  }

  // ===== GESTION DU TRI =====

  /**
   * Applique un tri sur une colonne
   */
  sortBy(column: string): void {
    const currentState = this.currentSortState;

    // Si même colonne, inverser la direction
    if (currentState.column === column) {
      const newDirection = currentState.direction === 'asc' ? 'desc' : 'asc';
      this.setSortState(column, newDirection);
    } else {
      // Nouvelle colonne, commencer par croissant
      this.setSortState(column, 'asc');
    }
  }

  /**
   * Définit l'état du tri
   */
  setSortState(column: string, direction: 'asc' | 'desc'): void {
    const newState: SortState = { column, direction };
    this.sortStateSubject.next(newState);
  }

  /**
   * Remet le tri à sa configuration par défaut
   */
  resetToDefault(): void {
    const defaultState: SortState = {
      column: this.defaultSortConfig.defaultColumn,
      direction: this.defaultSortConfig.defaultDirection
    };
    this.sortStateSubject.next(defaultState);
  }

  /**
   * Vérifie si une colonne est actuellement triée
   */
  isSorted(column: string): boolean {
    return this.sortColumn === column;
  }

  /**
   * Retourne l'icône de tri pour une colonne
   */
  getSortIcon(column: string): string {
    if (!this.isSorted(column)) {
      return this.sortIcons.neutral;
    }
    return this.sortDirection === 'asc'
      ? this.sortIcons.ascending
      : this.sortIcons.descending;
  }

  /**
   * Vérifie si une colonne est triable
   */
  isSortable(column: string): boolean {
    return this.defaultSortConfig.sortableColumns.some(col =>
      col.key === column && col.sortable
    );
  }

  // ===== LOGIQUE DE TRI SPÉCIALISÉE =====

  /**
   * Applique le tri sur une liste d'incidents
   */
  applySorting(incidents: Incident[]): Incident[] {
    const sortState = this.currentSortState;

    if (!sortState.column) {
      return incidents;
    }

    return [...incidents].sort((a, b) => {
      // Logique spéciale pour que les dates de clôture nulles soient toujours à la fin
      if (sortState.column === 'dateCloture') {
        const aHasDate = !!a.dateCloture;
        const bHasDate = !!b.dateCloture;
        if (aHasDate && !bHasDate) return -1; // a avec date vient avant b sans date
        if (!aHasDate && bHasDate) return 1;  // b avec date vient avant a sans date
      }

      const comparison = this.compareItems(a, b, sortState.column);
      return sortState.direction === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Compare deux incidents selon la colonne spécifiée
   */
  private compareItems(a: Incident, b: Incident, column: string): number {
    let valueA: any;
    let valueB: any;

    switch (column) {
      case 'id':
        valueA = a.id;
        valueB = b.id;
        break;

      case 'object':
        valueA = a.object.toLowerCase();
        valueB = b.object.toLowerCase();
        break;

      case 'domains':
        // Tri par le premier domaine (alphabétique)
        valueA = a.domains[0]?.toLowerCase() || '';
        valueB = b.domains[0]?.toLowerCase() || '';
        break;

      case 'gravity':
        // Tri par priorité de gravité (faible=1, très grave=4)
        valueA = GRAVITY_CONFIG[a.gravity].priority;
        valueB = GRAVITY_CONFIG[b.gravity].priority;
        break;

      case 'status':
        // Tri par priorité de statut (cloturé=1, en attente=2, etc.)
        valueA = STATUS_CONFIG[a.status]?.priority || 99;
        valueB = STATUS_CONFIG[b.status]?.priority || 99;
        break;

      case 'dateOuverture':
        valueA = this.parseDateString(a.dateOuverture)?.getTime() || 0;
        valueB = this.parseDateString(b.dateOuverture)?.getTime() || 0;
        break;

      case 'dateCloture':
        valueA = this.parseDateString(a.dateCloture)?.getTime() || 0;
        valueB = this.parseDateString(b.dateCloture)?.getTime() || 0;
        break;

      case 'sitesImpactes':
        valueA = (a.sitesImpactes || []).join(', ').toLowerCase();
        valueB = (b.sitesImpactes || []).join(', ').toLowerCase();
        break;

      case 'isNational':
        valueA = a.isNational ? 1 : 0;
        valueB = b.isNational ? 1 : 0;
        break;

      case 'ticketNumber':
        valueA = (a.ticketNumber || '').toLowerCase();
        valueB = (b.ticketNumber || '').toLowerCase();
        break;

      case 'redacteur_id':
        valueA = a.creator?.full_name?.toLowerCase() || '';
        valueB = b.creator?.full_name?.toLowerCase() || '';
        break;

      case 'intervenant_id':
        valueA = a.assignee?.full_name?.toLowerCase() || '';
        valueB = b.assignee?.full_name?.toLowerCase() || '';
        break;

      case 'has_pending_actions':
        valueA = a.has_pending_actions ? 1 : 0;
        valueB = b.has_pending_actions ? 1 : 0;
        break;

      default:
        return 0;
    }

    // Comparaison générique
    if (valueA < valueB) return -1;
    if (valueA > valueB) return 1;
    return 0;
  }

  /**
   * Parse une chaîne de date (potentiellement JJ/MM/AAAA) en objet Date.
   */
  private parseDateString(date: string | Date | undefined | null): Date | null {
    if (!date) return null;
    if (date instanceof Date) return date;

    if (typeof date === 'string') {
      const parts = date.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/);
      if (parts) {
        return new Date(+parts[3], +parts[2] - 1, +parts[1], +parts[4], +parts[5]);
      } else {
        try {
          const d = new Date(date);
          return isNaN(d.getTime()) ? null : d;
        } catch {
          return null;
        }
      }
    }
    return null;
  }
}