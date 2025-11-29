// src/app/services/pagination/pagination.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  PaginationState,
  PaginationConfig,
  PaginationInfo,
  PaginatedResult,
  PageSizeOption,
  DEFAULT_PAGINATION_CONFIG
} from '../../interfaces/pagination-config';

@Injectable({
  providedIn: 'root'
})
export class PaginationService {

  // ===== CONFIGURATION PAR DÉFAUT =====
  private config: PaginationConfig = DEFAULT_PAGINATION_CONFIG;

  // ===== ÉTAT RÉACTIF =====
  private paginationStateSubject = new BehaviorSubject<PaginationState>({
    currentPage: 1,
    pageSize: this.config.defaultPageSize,
    showAllResults: false,
    totalItems: 0
  });

  // ===== OBSERVABLES PUBLICS =====
  paginationState$ = this.paginationStateSubject.asObservable();

  constructor() { }

  // ===== GETTERS =====

  get currentState(): PaginationState {
    return this.paginationStateSubject.value;
  }

  get currentPage(): number {
    return this.currentState.currentPage;
  }

  get pageSize(): number {
    return this.currentState.pageSize;
  }

  get showAllResults(): boolean {
    return this.currentState.showAllResults;
  }

  get totalItems(): number {
    return this.currentState.totalItems;
  }

  get availablePageSizes(): number[] {
    return this.config.availablePageSizes;
  }

  // ===== GESTION DE L'ÉTAT =====

  /**
   * Met à jour le nombre total d'éléments
   */
  setTotalItems(totalItems: number): void {
    const currentState = this.currentState;
    const newState: PaginationState = {
      ...currentState,
      totalItems
    };

    // Ajuster la page courante si elle dépasse le nouveau total
    const totalPages = this.calculateTotalPages(totalItems, currentState.pageSize, currentState.showAllResults);
    if (currentState.currentPage > totalPages && totalPages > 0) {
      newState.currentPage = totalPages;
    }

    this.paginationStateSubject.next(newState);
  }

  /**
   * Change la taille de page
   */
  setPageSize(size: PageSizeOption): void {
    const currentState = this.currentState;

    if (size === 'all') {
      const newState: PaginationState = {
        ...currentState,
        showAllResults: true,
        currentPage: 1
      };
      this.paginationStateSubject.next(newState);
    } else {
      const newState: PaginationState = {
        ...currentState,
        pageSize: size,
        showAllResults: false,
        currentPage: 1
      };
      this.paginationStateSubject.next(newState);
    }
  }

  /**
   * Retourne la taille de la page courante
   */
  getCurrentPageSize(): number {
    return this.currentState.pageSize;
  }

  /**
   * Change la page courante
   */
  setCurrentPage(page: number): void {
    const currentState = this.currentState;
    const totalPages = this.getTotalPages();

    if (page >= 1 && page <= totalPages) {
      const newState: PaginationState = {
        ...currentState,
        currentPage: page
      };
      this.paginationStateSubject.next(newState);
    } else {
      // Page number is out of bounds, do nothing.
    }
  }

  /**
   * Page précédente
   */
  previousPage(): void {
    const currentPage = this.currentPage;
    if (currentPage > 1) {
      this.setCurrentPage(currentPage - 1);
    }
  }

  /**
   * Page suivante
   */
  nextPage(): void {
    const currentPage = this.currentPage;
    const totalPages = this.getTotalPages();
    if (currentPage < totalPages) {
      this.setCurrentPage(currentPage + 1);
    }
  }

  /**
   * Reset à la première page
   */
  resetToFirstPage(): void {
    this.setCurrentPage(1);
  }

  // ===== CALCULS DE PAGINATION =====

  /**
   * Calcule le nombre total de pages
   */
  getTotalPages(): number {
    const state = this.currentState;
    return this.calculateTotalPages(state.totalItems, state.pageSize, state.showAllResults);
  }

  private calculateTotalPages(totalItems: number, pageSize: number, showAllResults: boolean): number {
    if (showAllResults || totalItems === 0) {
      return 1;
    }
    return Math.ceil(totalItems / pageSize);
  }

  /**
   * Retourne les pages visibles avec ellipses
   */
  getVisiblePages(): number[] {
    const totalPages = this.getTotalPages();
    const currentPage = this.currentPage;
    const maxVisible = this.config.maxVisiblePages;
    const ellipsisThreshold = this.config.ellipsisThreshold;

    const visible: number[] = [];

    if (totalPages <= maxVisible) {
      // Afficher toutes les pages si peu nombreuses
      for (let i = 1; i <= totalPages; i++) {
        visible.push(i);
      }
    } else {
      // Logique complexe avec ellipses
      if (currentPage <= 4) {
        // Début : 1 2 3 4 5 ... N
        for (let i = 1; i <= 5; i++) {
          visible.push(i);
        }
        if (totalPages > ellipsisThreshold) {
          visible.push(-1); // Ellipse
          visible.push(totalPages);
        }
      } else if (currentPage >= totalPages - 3) {
        // Fin : 1 ... N-4 N-3 N-2 N-1 N
        visible.push(1);
        if (totalPages > ellipsisThreshold) {
          visible.push(-1); // Ellipse
        }
        for (let i = totalPages - 4; i <= totalPages; i++) {
          visible.push(i);
        }
      } else {
        // Milieu : 1 ... P-1 P P+1 ... N
        visible.push(1);
        visible.push(-1); // Ellipse
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          visible.push(i);
        }
        visible.push(-1); // Ellipse
        visible.push(totalPages);
      }
    }

    return visible;
  }

  /**
   * Retourne les informations de pagination
   */
  getPaginationInfo(): PaginationInfo {
    const state = this.currentState;

    if (state.showAllResults) {
      return {
        startIndex: 1,
        endIndex: state.totalItems,
        totalItems: state.totalItems,
        currentPage: 1,
        totalPages: 1,
        displayText: `Affichage de tous les ${state.totalItems} élément(s)`
      };
    }

    const startIndex = (state.currentPage - 1) * state.pageSize + 1;
    const endIndex = Math.min(state.currentPage * state.pageSize, state.totalItems);
    const totalPages = this.getTotalPages();

    return {
      startIndex,
      endIndex,
      totalItems: state.totalItems,
      currentPage: state.currentPage,
      totalPages,
      displayText: `Affichage de ${startIndex}-${endIndex} sur ${state.totalItems} élément(s)`
    };
  }

  // ===== PAGINATION DES DONNÉES =====

  /**
   * Applique la pagination sur un tableau de données
   */
  paginateData<T>(items: T[]): PaginatedResult<T> {
    // Mettre à jour le total d'items si différent
    if (items.length !== this.totalItems) {
      this.setTotalItems(items.length);
    }

    const state = this.currentState;

    if (state.showAllResults) {
      return {
        items: items,
        pagination: this.getPaginationInfo()
      };
    }

    const startIndex = (state.currentPage - 1) * state.pageSize;
    const endIndex = startIndex + state.pageSize;
    const paginatedItems = items.slice(startIndex, endIndex);

    return {
      items: paginatedItems,
      pagination: this.getPaginationInfo()
    };
  }

  // ===== UTILITAIRES =====

  /**
   * Vérifie si on peut aller à la page précédente
   */
  canGoPrevious(): boolean {
    return this.currentPage > 1;
  }

  /**
   * Vérifie si on peut aller à la page suivante
   */
  canGoNext(): boolean {
    return this.currentPage < this.getTotalPages();
  }

  /**
   * Vérifie si la pagination est nécessaire
   */
  isPaginationNeeded(): boolean {
    const state = this.currentState;
    return !state.showAllResults && state.totalItems > state.pageSize;
  }
}