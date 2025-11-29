// src/app/services/column-management/column-management.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ColumnConfig, ColumnPreferences, DragState, ResizeState, ColumnMenuState } from '../../models';

@Injectable({
  providedIn: 'root'
})
export class ColumnManagementService {

  private readonly defaultColumns: ColumnConfig[] = [
    { key: 'id', label: 'ID', visible: true, width: 70, minWidth: 60, sortable: true, order: 0 },
    { key: 'object', label: 'OBJET', visible: true, width: 200, minWidth: 150, sortable: true, order: 1 },
    { key: 'domains', label: 'DOMAINE', visible: true, width: 120, minWidth: 100, sortable: true, order: 2 },
    { key: 'gravity', label: 'GRAVITÉ', visible: true, width: 100, minWidth: 80, sortable: true, order: 3 },
    { key: 'status', label: 'STATUT', visible: true, width: 90, minWidth: 80, sortable: true, order: 4 },
    { key: 'dateOuverture', label: 'DATE OUVERTURE', visible: true, width: 100, minWidth: 100, sortable: true, order: 5 },
    { key: 'dateCloture', label: 'DATE CLÔTURE', visible: true, width: 100, minWidth: 100, sortable: true, order: 6 },
    { key: 'has_pending_actions', label: 'À FAIRE', visible: true, width: 70, minWidth: 70, sortable: true, order: 7 },
    { key: 'sitesImpactes', label: 'SITE IMPACTÉ', visible: true, width: 160, minWidth: 150, sortable: true, order: 8 },
    { key: 'isNational', label: 'NATIONAL', visible: true, width: 70, minWidth: 70, sortable: true, order: 9 },
    { key: 'ticketNumber', label: 'N° TICKET', visible: false, width: 130, minWidth: 100, sortable: true, order: 10 },
    { key: 'redacteur_id', label: 'RÉDACTEUR', visible: true, width: 150, minWidth: 120, sortable: true, order: 11 },
    { key: 'intervenant_id', label: 'INTERVENANT', visible: false, width: 150, minWidth: 120, sortable: true, order: 12 },
  ];

  // ===== ÉTAT RÉACTIF =====
  private columnsSubject = new BehaviorSubject<ColumnConfig[]>([...this.defaultColumns]);
  private dragStateSubject = new BehaviorSubject<DragState>({ draggingColumn: null, dragOverColumn: null });
  private resizeStateSubject = new BehaviorSubject<ResizeState>({ resizingColumn: null, resizeStartX: 0, resizeStartWidth: 0 });
  private menuStateSubject = new BehaviorSubject<ColumnMenuState>({ show: false, position: { x: 0, y: 0 } });

  // ===== OBSERVABLES PUBLICS =====
  columns$ = this.columnsSubject.asObservable();
  dragState$ = this.dragStateSubject.asObservable();
  resizeState$ = this.resizeStateSubject.asObservable();
  menuState$ = this.menuStateSubject.asObservable();

  constructor() {
    this.loadColumnPreferences();
  }

  // ===== GESTION DES COLONNES =====

  /**
   * Retourne les colonnes visibles triées par ordre
   */
  getVisibleColumns(): ColumnConfig[] {
    return this.columnsSubject.value
      .filter(col => col.visible)
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Retourne les colonnes masquées
   */
  getHiddenColumns(): ColumnConfig[] {
    return this.columnsSubject.value.filter(col => !col.visible);
  }

  /**
   * Obtient la configuration d'une colonne par sa clé
   */
  getColumnConfig(key: string): ColumnConfig | undefined {
    return this.columnsSubject.value.find(col => col.key === key);
  }

  /**
   * Bascule la visibilité d'une colonne (sans fermer le menu)
   */
  toggleColumnVisibility(columnKey: string, keepMenuOpen: boolean = false): void {
    const columns = this.columnsSubject.value;
    const column = columns.find(col => col.key === columnKey);

    if (column) {
      column.visible = !column.visible;
      this.columnsSubject.next([...columns]);
      this.saveColumnPreferences();

      // Fermer le menu SEULEMENT si keepMenuOpen est false (bouton ✕ sur en-têtes)
      if (!keepMenuOpen) {
        setTimeout(() => {
          this.hideColumnsMenu();
        }, 100);
      }
    }
  }

  /**
   * Réinitialise les colonnes à leur configuration par défaut (avec nettoyage localStorage)
   */
  resetColumnsToDefault(): void {
    // Nettoyer complètement le localStorage
    try {
      localStorage.removeItem('incidents_column_preferences');
    } catch (error) {
      console.error('Impossible de nettoyer le localStorage:', error);
    }

    // Réinitialiser avec la configuration par défaut
    const resetColumns = this.defaultColumns.map(col => ({
      ...col,
      width: this.getDefaultWidth(col.key),
      order: col.order
    }));

    this.columnsSubject.next(resetColumns);

    // Forcer la mise à jour immédiate pour éviter les problèmes de timing
    setTimeout(() => {
      this.columnsSubject.next([...resetColumns]);
    }, 0);
  }

  /**
   * Retourne le style CSS pour une colonne
   */
  getColumnStyle(columnKey: string): any {
    const column = this.getColumnConfig(columnKey);
    if (!column) return {};

    return {
      'width': `${column.width}px`,
      'min-width': `${column.minWidth}px`,
      'max-width': `${column.width}px`
    };
  }

  // ===== REDIMENSIONNEMENT =====

  /**
   * Démarre le redimensionnement d'une colonne
   */
  startResize(event: MouseEvent, columnKey: string): void {
    event.stopPropagation();
    event.preventDefault();

    const column = this.getColumnConfig(columnKey);
    if (!column) return;

    const resizeState: ResizeState = {
      resizingColumn: columnKey,
      resizeStartX: event.clientX,
      resizeStartWidth: column.width
    };

    this.resizeStateSubject.next(resizeState);

    // Listeners pour le drag
    document.addEventListener('mousemove', this.onResizeMove.bind(this));
    document.addEventListener('mouseup', this.onResizeEnd.bind(this));

    document.body.style.cursor = 'col-resize';
  }

  /**
   * Gère le mouvement pendant le redimensionnement
   */
  private onResizeMove(event: MouseEvent): void {
    const resizeState = this.resizeStateSubject.value;
    if (!resizeState.resizingColumn) return;

    const column = this.getColumnConfig(resizeState.resizingColumn);
    if (!column) return;

    const deltaX = event.clientX - resizeState.resizeStartX;
    const newWidth = Math.max(column.minWidth, resizeState.resizeStartWidth + deltaX);

    column.width = newWidth;
    this.columnsSubject.next([...this.columnsSubject.value]);
  }

  /**
   * Termine le redimensionnement
   */
  private onResizeEnd(): void {
    const resizeState = this.resizeStateSubject.value;
    if (resizeState.resizingColumn) {
      this.saveColumnPreferences();
    }

    this.resizeStateSubject.next({ resizingColumn: null, resizeStartX: 0, resizeStartWidth: 0 });
    document.body.style.cursor = 'default';

    document.removeEventListener('mousemove', this.onResizeMove.bind(this));
    document.removeEventListener('mouseup', this.onResizeEnd.bind(this));
  }

  /**
   * Vérifie si une colonne est en cours de redimensionnement
   */
  isResizing(columnKey: string): boolean {
    return this.resizeStateSubject.value.resizingColumn === columnKey;
  }

  // ===== DRAG & DROP =====

  /**
   * Démarre le drag d'une colonne
   */
  startColumnDrag(event: DragEvent, columnKey: string): void {
    event.stopPropagation();

    const dragState: DragState = { draggingColumn: columnKey, dragOverColumn: null };
    this.dragStateSubject.next(dragState);

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', columnKey);
    }
  }

  /**
   * Gère le drag over sur une colonne
   */
  onColumnDragOver(event: DragEvent, columnKey: string): void {
    event.preventDefault();
    event.stopPropagation();

    const dragState = this.dragStateSubject.value;
    if (dragState.draggingColumn && dragState.draggingColumn !== columnKey) {
      this.dragStateSubject.next({ ...dragState, dragOverColumn: columnKey });
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
    }
  }

  /**
   * Gère le drop sur une colonne
   */
  onColumnDrop(event: DragEvent, targetColumnKey: string): void {
    event.preventDefault();
    event.stopPropagation();

    const dragState = this.dragStateSubject.value;
    if (!dragState.draggingColumn || dragState.draggingColumn === targetColumnKey) {
      this.resetDragState();
      return;
    }

    this.reorderColumns(dragState.draggingColumn, targetColumnKey);
    this.resetDragState();
  }

  /**
   * Réorganise les colonnes après un drop
   */
  private reorderColumns(sourceKey: string, targetKey: string): void {
    const columns = this.columnsSubject.value;
    const sourceColumn = columns.find(col => col.key === sourceKey);
    const targetColumn = columns.find(col => col.key === targetKey);

    if (!sourceColumn || !targetColumn) return;

    const sourceOrder = sourceColumn.order;
    const targetOrder = targetColumn.order;

    sourceColumn.order = targetOrder;
    targetColumn.order = sourceOrder;

    this.columnsSubject.next([...columns]);
    this.saveColumnPreferences();
  }

  /**
   * Remet à zéro l'état du drag
   */
  resetDragState(): void {
    this.dragStateSubject.next({ draggingColumn: null, dragOverColumn: null });
  }

  /**
   * Vérifie si une colonne est en cours de drag
   */
  isDragging(columnKey: string): boolean {
    return this.dragStateSubject.value.draggingColumn === columnKey;
  }

  /**
   * Vérifie si une colonne est en drag over
   */
  isDragOver(columnKey: string): boolean {
    return this.dragStateSubject.value.dragOverColumn === columnKey;
  }

  // ===== MENU CONTEXTUEL =====

  /**
   * Affiche le menu de gestion des colonnes
   */
  showColumnsMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const menuState: ColumnMenuState = {
      show: true,
      position: { x: event.clientX, y: event.clientY }
    };
    this.menuStateSubject.next(menuState);

    setTimeout(() => {
      document.addEventListener('click', this.hideColumnsMenu.bind(this), { once: true });
    }, 0);
  }

  /**
   * Masque le menu des colonnes
   */
  hideColumnsMenu(): void {
    const menuState = this.menuStateSubject.value;
    this.menuStateSubject.next({ ...menuState, show: false });
  }

  // ===== PERSISTANCE =====

  /**
   * Sauvegarde les préférences des colonnes
   */
  private saveColumnPreferences(): void {
    try {
      const preferences: ColumnPreferences = {
        columns: this.columnsSubject.value.map(col => ({
          key: col.key,
          visible: col.visible,
          width: col.width,
          order: col.order
        })),
        timestamp: Date.now()
      };
      localStorage.setItem('incidents_column_preferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('Impossible de sauvegarder les préférences des colonnes:', error);
    }
  }

  /**
   * Charge les préférences des colonnes
   */
  private loadColumnPreferences(): void {
    try {
      const saved = localStorage.getItem('incidents_column_preferences');
      if (!saved) return;

      const preferences: ColumnPreferences = JSON.parse(saved);
      if (!preferences.columns) return;

      const columns = this.columnsSubject.value;
      preferences.columns.forEach((savedCol) => {
        const column = columns.find(col => col.key === savedCol.key);
        if (column) {
          column.visible = savedCol.visible;
          column.width = Math.max(column.minWidth, savedCol.width);
          column.order = savedCol.order;
        }
      });

      this.columnsSubject.next([...columns]);
    } catch (error) {
      console.error('Impossible de charger les préférences des colonnes:', error);
    }
  }
  getDefaultWidth(key: string): number {
    const defaults: { [key: string]: number } = {
      'id': 80,
      'object': 250,
      'domains': 160,
      'gravity': 100,
      'status': 100,
      'dateOuverture': 140,
      'dateCloture': 140,
      'siteImpacte': 130,
      'isNational': 80,
      'ticketNumber': 130,
      'redacteur_id': 160
    };
    return defaults[key] || 120;
  }
}