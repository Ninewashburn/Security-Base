// src/app/pages/modals/export-modal/export-modal.ts
import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { NotificationService } from '../../../services/notification/notification.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Incident } from '../../../models';
import { ExportOptions, IncidentExportService } from '../../../services/incident-export/incident-export.service';

@Component({
  selector: 'app-export-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './export-modal.html',
  styleUrl: './export-modal.scss'
})
export class ExportModal implements OnInit, OnChanges {

    // ===== INPUTS/OUTPUTS =====
  @Input() isVisible = false;
  @Input() incidents: Incident[] = [];
  @Input() filteredIncidents: Incident[] = [];
  @Input() hasActiveFilters = false;
  @Input() paginatedIncidents: Incident[] = []
  @Input() exportType: 'xlsx' | 'pdf' = 'xlsx';
  
  @Output() close = new EventEmitter<void>();
  @Output() export = new EventEmitter<ExportOptions>();

  // ===== PROPRIÉTÉS =====
  exportOptions: ExportOptions = {
    type: 'xlsx',
    period: 'current',
    selectedYear: new Date().getFullYear(),
    selectedMonths: 3,
    customStartDate: '',
    customEndDate: ''
  };

  constructor(
    private exportService: IncidentExportService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    // Initialiser le type d'export selon l'input ET réinitialiser à chaque ouverture
    this.exportOptions.type = this.exportType;
  }

  ngOnChanges(): void {
    // Mettre à jour le type quand l'input change
    if (this.exportOptions) {
      this.exportOptions.type = this.exportType;
    }
  }

  // ===== PROPRIÉTÉS CALCULÉES =====

  get totalIncidents(): number {
    return this.incidents.length;
  }

  get currentYear(): number {
    return this.exportService.currentYear;
  }

  get monthOptions() {
    return this.exportService.monthOptions;
  }

  get availableYears(): number[] {
    return this.exportService.getAvailableYears(this.incidents);
  }

  // ===== MÉTHODES DÉLÉGUÉES AU SERVICE =====

  getExportCount(): number {
    return this.exportService.getExportCount(this.incidents, this.filteredIncidents, this.exportOptions);
  }

  getExportPeriodLabel(): string {
    return this.exportService.getExportPeriodLabel(this.exportOptions);
  }

  getIncidentsByYear(year: number): Incident[] {
    return this.exportService.getIncidentsByYear(this.incidents, year);
  }

  getIncidentsByMonths(months: number): Incident[] {
    return this.exportService.getIncidentsByMonths(this.incidents, months);
  }

  getIncidentsByDateRange(startDate: string, endDate: string): Incident[] {
    return this.exportService.getIncidentsByDateRange(this.incidents, startDate, endDate);
  }

  // ===== ACTIONS =====

  onYearChange(year: string | number): void {
    this.exportOptions.selectedYear = typeof year === 'string' ? parseInt(year, 10) : year;
  }

  executeExport(): void {
    // FORCER LE TYPE CORRECT AVANT EXPORT
    this.exportOptions.type = this.exportType;
    
    if (this.getExportCount() === 0) {
      this.notificationService.warning(
        'Aucune donnée',
        'Aucun incident ne correspond aux critères sélectionnés'
      );
      return;
    };

    // Émettre l'événement avec les options
    this.export.emit(this.exportOptions);
    
    // Fermer la modal
    this.closeModal();
  }

  closeModal(): void {
    this.close.emit();
  }
}
