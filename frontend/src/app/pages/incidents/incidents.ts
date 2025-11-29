// src/app/components/incidents/incidents.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { Incident, IncidentStatus } from '../../models/incident.model';
import { ColumnConfig, DragState, ResizeState, ColumnMenuState } from '../../interfaces/column-config';
import { AdvancedFilters, ActiveFilter, FilterState } from '../../interfaces/filter-config';
import { SortState } from '../../interfaces/sort-config';
import { PaginationState, PaginationInfo, PaginatedResult, PageSizeOption } from '../../interfaces/pagination-config';

import { ColumnManagementService } from '../../services/colum-management/column-management.service';
import { DataFilteringService } from '../../services/data-filtering/data-filtering.service';
import { DataSortingService } from '../../services/data-sorting/data-sorting.service';
import { PaginationService } from '../../services/pagination/pagination.service';
import { IncidentDataService } from '../../services/incident-data/incident-data.service';
import { NotificationService } from '../../services/notification/notification.service';
import { IncidentDisplayService } from '../../services/incident-display/incident-display.service';
import { AppConfigService } from '../../services/app-config/app-config.service';
import { IncidentExportService, ExportOptions } from '../../services/incident-export/incident-export.service';

import { DiffusionListComponent } from '../modals/diffusion-list/diffusion-list';
import { ExportModal } from '../modals/export-modal/export-modal';
import { TrashModal } from '../modals/trash-modal/trash-modal';
import { PermissionService } from '../../services/permissions/permission.service';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-incidents',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DiffusionListComponent,
    ExportModal,
    TrashModal
  ],
  templateUrl: './incidents.html',
  styleUrl: './incidents.scss'
})
export class Incidents implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  constructor(
    public router: Router,
    private columnService: ColumnManagementService,
    private filterService: DataFilteringService,
    private sortingService: DataSortingService,
    private paginationService: PaginationService,
    private incidentDataService: IncidentDataService,
    private notificationService: NotificationService,
    private appConfigService: AppConfigService,
    private exportService: IncidentExportService,
    public permissionService: PermissionService,
    public incidentDisplayService: IncidentDisplayService,
    public authService: AuthService
  ) { }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  incidents: Incident[] = [];
  incidentsEnCours: Incident[] = [];
  incidentsClotures: Incident[] = [];
  incidentsEnAttente: Incident[] = [];
  filteredIncidents: Incident[] = [];
  paginatedResult: PaginatedResult<Incident> = {
    items: [],
    pagination: {
      startIndex: 0,
      endIndex: 0,
      totalItems: 0,
      currentPage: 1,
      totalPages: 1,
      displayText: ''
    }
  };

  get gravityConfig() { return this.incidentDisplayService.gravityConfig; }
  get statusConfig() { return this.incidentDisplayService.statusConfig; }

  isAdminModeActive: boolean = false;
  public isLoadingTable: boolean = false;
  showHelp: boolean = false;
  showTooltip: boolean = false;
  validating: number | null = null;

  showDiffusionModal = false;
  showTrashModal = false;
  showExportModal = false;
  exportModalType: 'xlsx' | 'pdf' = 'xlsx';

  visibleColumns: ColumnConfig[] = [];
  hiddenColumns: ColumnConfig[] = [];
  dragState: DragState = { draggingColumn: null, dragOverColumn: null };
  resizeState: ResizeState = { resizingColumn: null, resizeStartX: 0, resizeStartWidth: 0 };
  menuState: ColumnMenuState = { show: false, position: { x: 0, y: 0 } };

  filterState: FilterState = {
    searchTerm: '',
    advancedFilters: {
      id: '', object: '', domain: '', gravity: '', status: '', siteImpacte: '', redacteur_id: null, intervenant_id: null, dateFrom: '', dateTo: ''
    },
    showAdvancedFilters: false,
  };

  sortState: SortState = { column: 'dateOuverture', direction: 'desc' };
  paginationState: PaginationState = { currentPage: 1, pageSize: 10, showAllResults: false, totalItems: 0 };

  ngOnInit(): void {
    this.subscribeToServices();
    this.loadIncidents();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadIncidents(forceReload: boolean = false): void {
    this.isLoadingTable = true;

    const currentFilters = this.filterService.currentState;

    const apiFilters = {
      search: currentFilters.searchTerm || '',
      status: currentFilters.advancedFilters.status || '',
      gravite: currentFilters.advancedFilters.gravity || '',
      siteImpacte: currentFilters.advancedFilters.siteImpacte || '',
      dateFrom: currentFilters.advancedFilters.dateFrom || '',
      dateTo: currentFilters.advancedFilters.dateTo || '',
      showArchived: currentFilters.advancedFilters.status === 'archive'
    };

    this.incidentDataService.loadIncidents(apiFilters, forceReload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: incidents => {
          this.incidents = incidents;
          this.paginationService.setTotalItems(incidents.length);
          this.incidentsEnCours = this.incidents.filter(incident => incident.status === 'en_cours');
          this.incidentsClotures = this.incidents.filter(incident => incident.status === 'cloture');
          this.incidentsEnAttente = this.incidents.filter(incident => incident.status === 'en_attente');
          this.applyFiltersAndSort();
          this.isLoadingTable = false;
        },
        error: err => {
          console.error('Error loading incidents:', err);
          this.notificationService.error('Erreur de chargement', 'Impossible de charger les incidents.');
          this.isLoadingTable = false;
        }
      });
  }

  private subscribeToServices(): void {
    // ===== ÉCOUTE DES INCIDENTS EN TEMPS RÉEL =====
    this.incidentDataService.incidents
      .pipe(takeUntil(this.destroy$))
      .subscribe(incidents => {
        this.incidents = incidents;
        this.paginationService.setTotalItems(incidents.length);
        this.applyFiltersAndSort();
      });

    // ===== AUTRES SERVICES =====
    this.columnService.columns$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.visibleColumns = this.columnService.getVisibleColumns();
      this.hiddenColumns = this.columnService.getHiddenColumns();
    });

    this.columnService.dragState$.pipe(takeUntil(this.destroy$)).subscribe(state => this.dragState = state);
    this.columnService.resizeState$.pipe(takeUntil(this.destroy$)).subscribe(state => this.resizeState = state);
    this.columnService.menuState$.pipe(takeUntil(this.destroy$)).subscribe(state => this.menuState = state);

    let previousStatus = this.filterState.advancedFilters.status;

    this.filterService.filterState$.pipe(takeUntil(this.destroy$)).subscribe(state => {
      const newStatus = state.advancedFilters.status;
      this.filterState = state;

      if (previousStatus !== newStatus) {
        previousStatus = newStatus;
        this.loadIncidents(true);
      } else {
        this.applyFiltersAndSort();
      }
    });

    this.sortingService.sortState$.pipe(takeUntil(this.destroy$)).subscribe(state => {
      this.sortState = state;
      this.applyFiltersAndSort();
    });

    this.paginationService.paginationState$.pipe(takeUntil(this.destroy$)).subscribe(state => {
      this.paginationState = state;
      this.applyPagination();
    });
  }

  openExportXLSX(): void {
    this.exportModalType = 'xlsx';
    this.showExportModal = true;
  }

  openExportPDF(): void {
    this.exportModalType = 'pdf';
    this.showExportModal = true;
  }

  closeExportModal(): void {
    this.showExportModal = false;
  }

  onExportExecute(options: ExportOptions): void {
    if (options.type === 'xlsx') {
      this.exportService.exportToXLSX(this.incidents, this.filteredIncidents, options);
    } else {
      this.exportService.exportToPDF(this.incidents, this.filteredIncidents, options);
    }
  }

  openDiffusionModal(): void {
    this.showDiffusionModal = true;
  }

  closeDiffusionModal(): void {
    this.showDiffusionModal = false;
  }

  openTrashModal(): void {
    this.showTrashModal = true;
  }

  closeTrashModal(): void {
    this.showTrashModal = false;
    this.loadIncidents(true);
  }

  navigateToCreate(): void {
    this.router.navigate(['/incident/create']);
  }

  navigateToUpdate(incident: Incident): void {
    this.router.navigate(['/incident', incident.id, 'update']);
  }

  deleteIncident(incident: Incident): void {
    const confirmMessage = `Êtes-vous sûr de vouloir déplacer l'incident #${incident.id} vers la corbeille ?\n\nObjet: ${incident.object}\n\nCette action déplacera l'incident vers la corbeille, d'où il pourra être restauré ou supprimé définitivement.`;

    if (confirm(confirmMessage)) {
      this.incidentDataService.softDeleteIncident(incident.id).subscribe({
        // Le succès (notification et mise à jour de la liste) est géré dans le service
        error: (error: any) => {
          this.notificationService.error(
            'Erreur de mise à la corbeille',
            `L'incident n'a pas pu être déplacé. Détails: ${error.message || error}`
          );
        }
      });
    }
  }

  archiveIncident(incident: Incident): void {
    this.incidentDataService.archiveIncident(incident.id).subscribe({
      next: () => {
        this.notificationService.success(
          'Incident archivé',
          `L'incident #${incident.id} "${incident.object}" a été archivé.`
        );
      },
      error: (error: any) => {
        this.notificationService.error(`Erreur d'archivage. Détails: ${error.message || error}`);
      }
    });
  }

  restoreIncident(incident: Incident): void {
    this.incidentDataService.unarchiveIncident(incident.id).subscribe({
      next: () => {
        // Le service gère automatiquement la mise à jour
        this.notificationService.success(
          'Incident restauré',
          `L'incident #${incident.id} "${incident.object}" a été restauré.`
        );
      },
      error: (error: any) => {
        this.notificationService.error(`Erreur de restauration. Détails: ${error.message || error}`);
      }
    });
  }

  viewIncidentDetail(incident: Incident): void {
    this.router.navigate(['/incident', incident.id]);
  }

  toggleArchivedView(): void {
    const currentStatus = this.filterState.advancedFilters.status;
    const newStatus = currentStatus === 'archive' ? '' : 'archive';
    this.setAdvancedFilter('status', newStatus);
  }


  /**
   * Vérifier si un incident nécessite une validation
   */
  needsValidation(incident: Incident): boolean {
    return ['grave', 'tres_grave'].includes(incident.gravity) &&
      incident.status === 'en_attente' &&
      !incident.validated;
  }

  /**
   * Valider un incident
   */
  validateIncident(incident: Incident): void {
    const message = `Valider l'incident "${incident.object}" ?\n\nCela changera son statut vers "En cours".`;

    if (!confirm(message)) {
      return;
    }

    this.validating = incident.id;

    this.incidentDataService.validateIncident(incident.id).subscribe({
      next: () => {
        // Le service met à jour automatiquement la liste
        this.notificationService.success(
          'Validation réussie',
          `Incident #${incident.id} validé. Statut changé vers "En cours".`
        );
        this.validating = null;
      },
      error: (error) => {
        console.error('Erreur validation:', error);
        this.notificationService.error(
          'Erreur de validation',
          `Impossible de valider l'incident: ${error.message || error}`
        );
        this.validating = null;
      }
    });
  }

  toggleColumnVisibility(columnKey: string): void { this.columnService.toggleColumnVisibility(columnKey); }
  toggleColumnVisibilityKeepOpen(columnKey: string): void { this.columnService.toggleColumnVisibility(columnKey, true); }
  resetColumnsToDefault(): void { this.columnService.resetColumnsToDefault(); }
  getColumnStyle(columnKey: string): any { return this.columnService.getColumnStyle(columnKey); }
  startResize(event: MouseEvent, columnKey: string): void { this.columnService.startResize(event, columnKey); }
  startColumnDrag(event: DragEvent, columnKey: string): void { this.columnService.startColumnDrag(event, columnKey); }
  onColumnDragOver(event: DragEvent, columnKey: string): void { this.columnService.onColumnDragOver(event, columnKey); }
  onColumnDrop(event: DragEvent, targetColumnKey: string): void { this.columnService.onColumnDrop(event, targetColumnKey); }
  resetDragState(): void { this.columnService.resetDragState(); }
  showColumnsMenu(event: MouseEvent): void { this.columnService.showColumnsMenu(event); }
  hideColumnsMenu(): void { this.columnService.hideColumnsMenu(); }
  isResizing(columnKey: string): boolean { return this.columnService.isResizing(columnKey); }
  isDragging(columnKey: string): boolean { return this.columnService.isDragging(columnKey); }
  isDragOver(columnKey: string): boolean { return this.columnService.isDragOver(columnKey); }

  onSearch(): void {
    this.filterService.setSearchTerm(this.filterState.searchTerm);
    this.paginationService.resetToFirstPage();
  }
  toggleAdvancedSearch(): void { this.filterService.toggleAdvancedFilters(); }
  setAdvancedFilter(key: keyof AdvancedFilters, value: string): void {
    this.filterService.setAdvancedFilter(key, value);
    this.paginationService.resetToFirstPage();
  }
  resetAdvancedFilters(): void {
    this.filterService.resetAdvancedFilters();
    this.paginationService.resetToFirstPage();
  }
  clearAllFilters(): void {
    this.filterService.clearAllFilters();
    this.paginationService.resetToFirstPage();
  }
  hasActiveFilters(): boolean { return this.filterService.hasActiveFilters(); }
  getActiveFilters(): ActiveFilter[] { return this.filterService.getActiveFilters(); }
  removeFilter(filterKey: string, filterType: 'search' | 'filter'): void {
    this.filterService.removeFilter(filterKey, filterType);
    this.paginationService.resetToFirstPage();
  }

  sortBy(column: string): void {
    if (this.sortingService.isSortable(column)) {
      this.sortingService.sortBy(column);
    }
  }
  getSortIcon(column: string): string { return this.sortingService.getSortIcon(column); }
  isSorted(column: string): boolean { return this.sortingService.isSorted(column); }

  changePageSize(size: PageSizeOption): void { this.paginationService.setPageSize(size); }
  onPageSizeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (target?.value) {
      const value: PageSizeOption = target.value === 'all' ? 'all' : +target.value;
      this.changePageSize(value);
    }
  }
  goToPage(page: number): void { this.paginationService.setCurrentPage(page); }
  previousPage(): void { this.paginationService.previousPage(); }
  nextPage(): void { this.paginationService.nextPage(); }

  formatDateShort(date: Date): string {
    return this.incidentDisplayService.formatDateShort(date);
  }

  formatTimeShort(date: Date): string {
    return this.incidentDisplayService.formatTimeShort(date);
  }

  getShortDomain(domain: string): string {
    return this.incidentDisplayService.getShortDomain(domain);
  }

  getShortSiteImpacte(siteImpacte: string | undefined): string {
    return this.incidentDisplayService.getShortSiteImpacte(siteImpacte);
  }

  getStatusTextClass(status: IncidentStatus): string {
    return this.incidentDisplayService.getStatusTextClass(status);
  }

  getDomainFilterOptions(): { value: string; label: string }[] {
    return this.appConfigService.getSelectOptions('domains');
  }

  getGravityFilterOptions(): { value: string; label: string }[] {
    return this.appConfigService.getSelectOptions('gravity');
  }

  getStatusFilterOptions(): { value: string; label: string }[] {
    const allStatusOptions = this.appConfigService.getSelectOptions('status');
    if (!this.permissionService.canArchiveIncidents()) {
      // On retourne une nouvelle liste qui exclut l'option 'archive'
      return allStatusOptions.filter(option => option.value !== 'archive');
    }

    return allStatusOptions;
  }

  getSiteFilterOptions(): { value: string; label: string }[] {
    return this.appConfigService.getSelectOptions('sites');
  }

  getGroupedSiteOptions(): { label: string; options: { value: string; label: string }[] }[] {
    return this.appConfigService.getGroupedSiteOptions();
  }

  get showColumnMenu(): boolean { return this.menuState.show; }
  get columnMenuPosition(): { x: number; y: number } { return this.menuState.position; }
  get searchTerm(): string { return this.filterState.searchTerm; }
  set searchTerm(value: string) { this.filterState = { ...this.filterState, searchTerm: value }; }
  get advancedFilters(): AdvancedFilters { return this.filterState.advancedFilters; }
  get showAdvancedFilters(): boolean { return this.filterState.showAdvancedFilters; }
  get sortColumn(): string { return this.sortState.column; }
  get sortDirection(): 'asc' | 'desc' { return this.sortState.direction; }
  get paginatedIncidents(): Incident[] { return this.paginatedResult.items; }
  get currentPage(): number { return this.paginationState.currentPage; }
  get pageSize(): number { return this.paginationState.pageSize; }
  get showAllResults(): boolean { return this.paginationState.showAllResults; }
  get availablePageSizes(): number[] { return this.paginationService.availablePageSizes; }
  get totalPages(): number { return this.paginationService.getTotalPages(); }
  get visiblePages(): number[] { return this.paginationService.getVisiblePages(); }
  get paginationInfo(): PaginationInfo { return this.paginatedResult.pagination; }

  private applyFiltersAndSort(): void {
    this.filteredIncidents = this.filterService.applyFilters(this.incidents);
    this.filteredIncidents = this.sortingService.applySorting(this.filteredIncidents);
    this.applyPagination();
  }

  private applyPagination(): void {
    this.paginatedResult = this.paginationService.paginateData(this.filteredIncidents);
  }

  getPaginationInfo(): string {
    return this.paginatedResult.pagination.displayText;
  }

  toggleAdminMode(): void {
    this.isAdminModeActive = !this.isAdminModeActive;
  }

  toggleHelp(): void {
    this.showHelp = !this.showHelp;
    this.showTooltip = false;
  }

  getIncidentsByStatus(status: IncidentStatus): Incident[] {
    return this.incidents.filter(incident => incident.status === status);
  }

  resetColumnsAndCloseMenu(): void {
    this.columnService.resetColumnsToDefault();
    setTimeout(() => {
      this.hideColumnsMenu();
    }, 100);
  }
}