// src/app/services/incident-export/incident-export.service.ts

import { Injectable } from '@angular/core';
import { NotificationService } from '../notification/notification.service';
import { Incident, GRAVITY_CONFIG, STATUS_CONFIG, GravityLevel, IncidentStatus } from '../../models/incident.model';

export interface ExportOptions {
  type: 'xlsx' | 'pdf';
  period: 'all' | 'current' | 'year' | 'custom-year' | 'months' | 'custom-range';
  selectedYear?: number;
  selectedMonths?: number;
  customStartDate?: string;
  customEndDate?: string;
}

@Injectable({
  providedIn: 'root'
})
export class IncidentExportService {

  constructor(private notificationService: NotificationService) { }

  /**
   * Année courante
   */
  get currentYear(): number {
    return new Date().getFullYear();
  }

  /**
   * Options prédéfinies pour les mois
   */
  get monthOptions(): { label: string; value: number }[] {
    return [
      { label: '1 mois', value: 1 },
      { label: '2 mois', value: 2 },
      { label: '3 mois', value: 3 },
      { label: '6 mois', value: 6 },
      { label: '12 mois', value: 12 },
      { label: '24 mois', value: 24 }
    ];
  }

  /**
   * Export PDF d'un incident individuel
   * @param incident L'incident à exporter
   */
  exportIncidentToPDF(incident: Incident): void {
    if (!incident) {
      this.notificationService.error('Erreur', 'Aucun incident à exporter');
      return;
    }

    // Créer une nouvelle fenêtre pour l'impression
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) {
      this.notificationService.error(
        'Erreur d\'impression',
        'Impossible d\'ouvrir la fenêtre d\'impression. Vérifiez que les popups sont autorisés.'
      );
      return;
    }

    // Générer le HTML pour l'impression de l'incident
    const htmlContent = this.generateIncidentPrintHTML(incident);

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Attendre le chargement avec délai
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();

        // Fermer après impression
        printWindow.onafterprint = () => {
          setTimeout(() => {
            printWindow.close();
          }, 1000);
        };
      }, 500);
    };

    this.notificationService.success(
      'Export PDF initié',
      `Impression de l'incident #${incident.id} en cours`
    );
  }

  /**
   * Génère le HTML d'impression pour un incident individuel
   */
  private generateIncidentPrintHTML(incident: Incident): string {
    const exportDate = new Date().toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Incident #${incident.id} - ${incident.object}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              font-size: 14px;
              line-height: 1.6;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #333; 
              padding-bottom: 20px; 
            }
            .header h1 { 
              margin: 0; 
              color: #333; 
              font-size: 24px;
            }
            .header p { 
              margin: 5px 0; 
              color: #666; 
            }
            .incident-details {
              margin: 20px 0;
            }
            .detail-section {
              margin-bottom: 25px;
              page-break-inside: avoid;
            }
            .detail-section h2 {
              color: #333;
              border-bottom: 1px solid #ddd;
              padding-bottom: 5px;
              margin-bottom: 15px;
              font-size: 18px;
            }
            .detail-row {
              display: flex;
              margin-bottom: 10px;
              align-items: flex-start;
            }
            .detail-label {
              font-weight: bold;
              width: 180px;
              flex-shrink: 0;
              color: #555;
            }
            .detail-value {
              flex: 1;
              word-wrap: break-word;
            }
            .status-badge {
              padding: 4px 12px;
              border-radius: 15px;
              font-size: 12px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .status-cloture {
              background-color: #dcfce7;
              color: #166534;
            }
            .status-en_cours {
              background-color: #fed7aa;
              color: #9a3412;
            }
            .status-en_attente {
              background-color: #fefcbf;
              color: #CA8A04;
            }
            .gravity-tres_grave {
              color: #dc2626;
              font-weight: bold;
            }
            .gravity-grave {
              color: #dc2626;
              font-weight: bold;
            }
            .gravity-moyen {
              color: #d97706;
              font-weight: bold;
            }
            .gravity-faible {
              color: #2563eb;
              font-weight: bold;
            }
            .national-badge, .a-faire-badge {
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: bold;
            }
            .national-badge {
              background-color: #f3e8ff;
              color: #7c3aed;
            }
            .a-faire-badge {
              background-color: #fed7aa;
              color: #9a3412;
            }
            .description-content {
              background-color: #f9fafb;
              padding: 15px;
              border-radius: 6px;
              border-left: 4px solid #3b82f6;
              margin-top: 10px;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              color: #666;
              font-size: 12px;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Fiche Incident #${incident.id}</h1>
            <p><strong>${incident.object}</strong></p>
            <p>Exporté le ${exportDate} • Caisse Nationale</p>
          </div>
          
          <div class="incident-details">
            <!-- Informations générales -->
            <div class="detail-section">
              <h2>📋 Informations générales</h2>
              <div class="detail-row">
                <div class="detail-label">Objet :</div>
                <div class="detail-value">${incident.object}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Gravité :</div>
                <div class="detail-value">
                  <span class="gravity-${(incident.gravity || '').toLowerCase()}">${this.getGravityLabel(incident.gravity)}</span>
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Statut :</div>
                <div class="detail-value">
                  <span class="status-badge status-${incident.status}">${this.getStatusLabel(incident.status)}</span>
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Date ouverture :</div>
                <div class="detail-value">${this.formatDateForPrint(incident.dateOuverture)}</div>
              </div>
              ${incident.dateCloture ? `
                <div class="detail-row">
                  <div class="detail-label">Date clôture :</div>
                  <div class="detail-value">${this.formatDateForPrint(incident.dateCloture)}</div>
                </div>
              ` : ''}
              <div class="detail-row">
                <div class="detail-label">Actions à mener :</div>
                <div class="detail-value">
                  ${incident.has_pending_actions ? '<span class="a-faire-badge">Oui</span>' : 'Non'}
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Rédacteur :</div>
                <div class="detail-value">${incident.creator?.full_name || 'N/A'}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Intervenant :</div>
                <div class="detail-value">${incident.assignee?.full_name || 'N/A'}</div>
              </div>
              ${incident.ticketNumber ? `
                <div class="detail-row">
                  <div class="detail-label">N° Ticket :</div>
                  <div class="detail-value">${incident.ticketNumber}</div>
                </div>
              ` : ''}
            </div>

            <!-- Domaines et Impact -->
            <div class="detail-section">
              <h2>🎯 Domaines et Impact</h2>
              <div class="detail-row">
                <div class="detail-label">Domaines :</div>
                <div class="detail-value">${(incident.domains || []).join(', ') || 'Non spécifié'}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Publics impactés :</div>
                <div class="detail-value">${(incident.publicsImpactes || []).join(', ') || 'Non spécifié'}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Sites impactés :</div>
                <div class="detail-value">${(incident.sitesImpactes || []).join(', ') || 'Non spécifié'}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Impact national :</div>
                <div class="detail-value">
                  ${incident.isNational ? '<span class="national-badge">Oui</span>' : 'Non'}
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Météo :</div>
                <div class="detail-value">
                  ${incident.meteo === undefined ? 'Non renseigné' : (incident.meteo ? 'Oui' : 'Non')}
                </div>
              </div>
            </div>

            <!-- Description -->
            <div class="detail-section">
              <h2>📝 Description</h2>
              <div class="description-content">
                ${incident.description || 'Aucune description disponible'}
              </div>
            </div>

            <!-- Actions à Mener -->
            ${(incident.actionsAMener && incident.actionsAMener.length > 0) ? `
              <div class="detail-section">
                <h2>📋 Actions à Mener</h2>
                <div class="description-content">
                  <ul>${incident.actionsAMener.map(action => `<li>${action}</li>`).join('')}</ul>
                </div>
              </div>
            ` : ''}

            <!-- Actions Menées -->
            ${(incident.actionsMenees && incident.actionsMenees.length > 0) ? `
              <div class="detail-section">
                <h2>⚡ Actions Menées</h2>
                <div class="description-content">
                  <ul>${incident.actionsMenees.map(action => `<li>${action}</li>`).join('')}</ul>
                </div>
              </div>
            ` : ''}

            <!-- Temps d'Indisponibilité -->
            ${incident.tempsIndisponibilite ? `
              <div class="detail-section">
                <h2>⏱️ Temps d'Indisponibilité</h2>
                <div class="description-content">
                  ${incident.tempsIndisponibilite}
                </div>
              </div>
            ` : ''}
            
          </div>

          <div class="footer">
            <p>Document généré automatiquement par Security-Base</p>
            <p>Caisse Nationale - Système de gestion des incidents de sécurité</p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Formate une date pour l'impression
   */
  private formatDateForPrint(date: string | Date | undefined): string {
    const dateObj = this.parseDateString(date);
    if (!dateObj) return '-';

    return dateObj.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  /**
   * Export XLSX avec dynamic import
   */
  async exportToXLSX(incidents: Incident[], filteredIncidents: Incident[], options: ExportOptions): Promise<void> {
    const incidentsToExport = this.getIncidentsForExport(incidents, filteredIncidents, options);

    if (incidentsToExport.length === 0) {
      this.notificationService.warning(
        'Aucune donnée à exporter',
        'Aucun incident ne correspond aux critères sélectionnés.'
      );
      return;
    }

    try {
      // 🚀 DYNAMIC IMPORT: ExcelJS chargé uniquement à la demande
      const ExcelJS = await import('exceljs');

      await this.generateXLSX(incidentsToExport, options, ExcelJS);

      this.notificationService.success(
        'Export Excel réussi',
        `${incidentsToExport.length} incident(s) exporté(s) avec succès`
      );
    } catch (error) {
      console.error('Erreur lors de l\'export Excel:', error);
      this.notificationService.error(
        'Erreur d\'export',
        'Une erreur est survenue lors de la génération du fichier Excel'
      );
    }
  }

  /**
   * Export PDF avec options temporelles
   */
  exportToPDF(incidents: Incident[], filteredIncidents: Incident[], options: ExportOptions): void {
    const incidentsToExport = this.getIncidentsForExport(incidents, filteredIncidents, options);

    if (incidentsToExport.length === 0) {
      this.notificationService.warning(
        'Aucune donnée à exporter',
        'Aucun incident ne correspond aux critères sélectionnés.'
      );
      return;
    }

    this.generatePDF(incidentsToExport, options);

    this.notificationService.success(
      'Export PDF initié',
      `Impression de ${incidentsToExport.length} incident(s) en cours`
    );
  }

  /**
   * Génère un fichier Excel avec le module chargé dynamiquement
   */
  private async generateXLSX(incidents: Incident[], options: ExportOptions, ExcelJS: any): Promise<void> {
    // Créer un nouveau workbook
    const workbook = new ExcelJS.Workbook();

    // Configuration du workbook
    workbook.creator = 'Security-Base';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Ajouter la feuille principale
    const worksheet = workbook.addWorksheet('Incidents de Sécurité');

    // Headers de colonnes
    const headers = [
      'ID',
      'Objet',
      'Domaines',
      'Gravité',
      'Statut',
      'Date ouverture',
      'Date clôture',
      'À faire',
      'Sites impactés',
      'N° Ticket',
      'Rédacteur',
      'Intervenant',
      'Description',
      'Actions à Mener',
      'Actions Menées',
      'Temps d\'Indisponibilité'
    ];

    // Ajouter les headers avec style
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell: any) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '366092' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Ajouter les données
    incidents.forEach(incident => {
      // Concaténer les sites et le statut national
      const sitesImpactes = (incident.sitesImpactes?.join(', ') || '') +
        (incident.isNational ? ' (National)' : '');

      const row = worksheet.addRow([
        incident.id,
        incident.object,
        incident.domains?.join(', ') || '',
        this.getGravityLabel(incident.gravity),
        this.getStatusLabel(incident.status),
        this.formatDateForExport(incident.dateOuverture),
        incident.dateCloture ? this.formatDateForExport(incident.dateCloture) : '',
        incident.has_pending_actions ? 'Oui' : 'Non',
        sitesImpactes,
        incident.ticketNumber || '',
        incident.creator?.full_name || '',
        incident.assignee?.full_name || '',
        this.stripHtml(incident.description),
        (incident.actionsAMener || []).map(action => this.stripHtml(action)).join('\n'),
        (incident.actionsMenees || []).map(action => this.stripHtml(action)).join('\n'),
        incident.tempsIndisponibilite || ''
      ]);

      // Style conditionnel selon la gravité
      this.applyRowStyle(row, incident.gravity);
    });

    // Largeurs fixes optimisées
    const columnWidths = [
      8,   // ID
      50,  // Objet
      50,  // Domaines
      10,  // Gravité
      10,  // Statut
      15,  // Date ouverture
      15,  // Date clôture
      10,  // À faire
      50,  // Sites impactés
      16,  // N° Ticket
      20,  // Rédacteur
      20,  // Intervenant
      60,  // Description
      60,  // Actions à Mener
      60,  // Actions Menées
      60   // Temps d'Indisponibilité
    ];

    // Appliquer les largeurs
    if (worksheet.columns) {
      worksheet.columns.forEach((column: any, index: number) => {
        if (column) {
          column.width = columnWidths[index] || 20;
        }
      });
    }

    // Figer la première ligne (headers)
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Générer le fichier et télécharger
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = this.generateFilename(options, 'xlsx');

    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    // Télécharger le fichier Excel
    this.downloadBlob(blob, filename);
  }

  /**
   * Supprime les balises HTML d'une chaîne de caractères pour un export propre.
   * @param html La chaîne contenant du HTML
   * @returns La chaîne sans HTML
   */
  private stripHtml(html: string | null | undefined): string {
    if (!html) return '';
    // Utilise le DOMParser du navigateur pour une conversion fiable
    const doc = new DOMParser().parseFromString(html, 'text/html');
    // Remplace les sauts de ligne de Quill (<p><br></p>) par des sauts de ligne texte
    return doc.body.textContent?.replace(/\n\n/g, '\n') || '';
  }

  /**
   * Style conditionnel selon la gravité
   */
  private applyRowStyle(row: any, gravity: string): void {
    let fillColor = '';

    switch (gravity?.toLowerCase()) {
      case 'tres_grave':
        fillColor = 'FFEBEE'; // Rouge
        break;
      case 'grave':
        fillColor = 'FFF3E0'; // Orange
        break;
      case 'moyen':
        fillColor = 'F1F8E9'; // Vert
        break;
      case 'faible':
        fillColor = 'E3F2FD'; // Bleu
        break;
      default:
        fillColor = 'FAFAFA'; // Gris
    }

    row.eachCell((cell: any) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: fillColor }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'E0E0E0' } },
        left: { style: 'thin', color: { argb: 'E0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'E0E0E0' } },
        right: { style: 'thin', color: { argb: 'E0E0E0' } }
      };
    });
  }

  /**
   * Télécharge un blob (Excel)
   */
  private downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  /**
   * Récupère les incidents selon la période sélectionnée
   */
  getIncidentsForExport(incidents: Incident[], filteredIncidents: Incident[], options: ExportOptions): Incident[] {
    switch (options.period) {
      case 'all':
        return [...incidents];

      case 'current':
        return [...filteredIncidents];

      case 'year':
        return this.getIncidentsByYear(incidents, this.currentYear);

      case 'custom-year':
        return this.getIncidentsByYear(incidents, options.selectedYear || this.currentYear);

      case 'months':
        return this.getIncidentsByMonths(incidents, options.selectedMonths || 3);

      case 'custom-range':
        return this.getIncidentsByDateRange(incidents, options.customStartDate || '', options.customEndDate || '');

      default:
        return [...incidents];
    }
  }

  /**
   * Récupère les incidents d'une année donnée
   */
  getIncidentsByYear(incidents: Incident[], year: number): Incident[] {
    return incidents.filter(incident => {
      const incidentDate = this.parseDateString(incident.dateOuverture);
      if (!incidentDate) return false;
      return incidentDate.getFullYear() === year;
    });
  }

  /**
   * Récupère les incidents des X derniers mois
   */
  getIncidentsByMonths(incidents: Incident[], months: number): Incident[] {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);

    return incidents.filter(incident => {
      const incidentDate = this.parseDateString(incident.dateOuverture);
      if (!incidentDate) return false;
      return incidentDate >= cutoffDate;
    });
  }

  /**
   * Récupère les incidents dans une plage de dates
   */
  getIncidentsByDateRange(incidents: Incident[], startDate: string, endDate: string): Incident[] {
    if (!startDate || !endDate) return [];

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return incidents.filter(incident => {
      const incidentDate = this.parseDateString(incident.dateOuverture);
      if (!incidentDate) return false;
      return incidentDate >= start && incidentDate <= end;
    });
  }

  /**
   * Récupère le libellé lisible pour une gravité donnée
   */
  private getGravityLabel(gravity: string): string {
    const lowerCaseGravity = (gravity || '').toLowerCase() as GravityLevel;
    return GRAVITY_CONFIG[lowerCaseGravity]?.label || gravity;
  }

  /**
   * Récupère le libellé lisible pour un statut donné
   */
  private getStatusLabel(status: IncidentStatus): string {
    const lowerCaseStatus = (status || '').toLowerCase() as IncidentStatus;
    return STATUS_CONFIG[lowerCaseStatus]?.label || status;
  }

  /**
   * Génère le PDF pour impression
   */
  private generatePDF(incidents: Incident[], options: ExportOptions): void {
    // Créer une nouvelle fenêtre pour l'impression avec taille spécifique
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) {
      this.notificationService.error('Erreur', 'Impossible d\'ouvrir la fenêtre d\'impression. Vérifiez que les popups sont autorisés.');
      return;
    }

    // Générer le HTML pour l'impression
    const htmlContent = this.generatePrintHTML(incidents, options);

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Attendre le chargement avec délai
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();

        // Optionnel : fermer après impression
        printWindow.onafterprint = () => {
          setTimeout(() => {
            printWindow.close();
          }, 1000);
        };
      }, 500);
    };
  }

  /**
   * Génère le HTML pour l'impression PDF
   */
  private generatePrintHTML(incidents: Incident[], options: ExportOptions): string {
    const title = `Base d'Incidents Sécurité - ${this.getExportPeriodLabel(options)}`;
    const exportDate = new Date().toLocaleDateString('fr-FR');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 10px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; } 
            .header h1 { margin: 0; color: #333; font-size: 18px; }
            .header p { margin: 5px 0; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; table-layout: fixed; }
            th, td { border: 1px solid #ddd; padding: 5px; text-align: left; vertical-align: top; word-wrap: break-word; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .status-cloture { color: #16a34a; font-weight: bold; }
            .status-en_cours { color: #ea580c; font-weight: bold; }
            .status-en_attente { color: #CA8A04; font-weight: bold; }
            .gravity-tres_grave { color: #dc2626; font-weight: bold; }
            .gravity-grave { color: #dc2626; font-weight: bold; }
            .gravity-moyen { color: #d97706; font-weight: bold; }
            .gravity-faible { color: #2563eb; font-weight: bold; }
            .national { background-color: #f3e8ff; color: #7c3aed; padding: 2px 6px; border-radius: 3px; font-weight: bold; }
            .a-faire-badge { background-color: #fed7aa; color: #9a3412; padding: 2px 6px; border-radius: 3px; font-weight: bold; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${title}</h1>
            <p>Exporté le ${exportDate}</p>
            <p>${incidents.length} incident(s) • URSSAF Caisse Nationale</p>
          </div>
          
          <table>
            <colgroup>
              <col style="width: 3%;">
              <col style="width: 10%;">
              <col style="width: 5%;">
              <col style="width: 5%;">
              <col style="width: 6%;">
              <col style="width: 6%;">
              <col style="width: 5%;">
              <col style="width: 8%;">
              <col style="width: 7%;">
              <col style="width: 7%;">
              <col style="width: 9%;">
              <col style="width: 10%;">
              <col style="width: 10%;">
              <col style="width: 9%;">
            </colgroup>
            <thead>
              <tr>
                <th>ID</th>
                <th>Objet</th>
                <th>Gravité</th>
                <th>Statut</th>
                <th>Ouverture</th>
                <th>Clôture</th>
                <th>À faire</th>
                <th>Sites</th>
                <th>Rédacteur</th>
                <th>Intervenant</th>
                <th>Description</th>
                <th>Actions à Mener</th>
                <th>Actions Menées</th>
                <th>Indisponibilité</th>
              </tr>
            </thead>
            <tbody>
              ${incidents.map(incident => `
                <tr>
                  <td>#${incident.id}</td>
                  <td>${this.stripHtml(incident.object)}</td>
                  <td class="gravity-${(incident.gravity || '').toLowerCase()}">${this.getGravityLabel(incident.gravity)}</td>
                  <td class="status-${incident.status}">${this.getStatusLabel(incident.status)}</td>
                  <td>${this.formatDateForExport(incident.dateOuverture)}</td>
                  <td>${incident.dateCloture ? this.formatDateForExport(incident.dateCloture) : '-'}</td>
                  <td>${incident.has_pending_actions ? '<span class="a-faire-badge">Oui</span>' : 'Non'}</td>
                  <td>${this.stripHtml(incident.sitesImpactes?.join(', ') || '')}${incident.isNational ? ' <span class="national">National</span>' : ''}</td>
                  <td>${incident.creator?.full_name || '-'}</td>
                  <td>${incident.assignee?.full_name || '-'}</td>
                  <td>${this.stripHtml(incident.description)}</td>
                  <td>${(incident.actionsAMener || []).map(action => this.stripHtml(action)).join('\
')}</td>
                  <td>${(incident.actionsMenees || []).map(action => this.stripHtml(action)).join('\
')}</td>
                  <td>${this.stripHtml(incident.tempsIndisponibilite)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
  }

  /**
   * Formate une date pour l'export
   */
  private formatDateForExport(date: string | Date | undefined): string {
    const dateObj = this.parseDateString(date);
    if (!dateObj) return '';
    return dateObj.toLocaleDateString('fr-FR');
  }

  /**
   * Génère un nom de fichier basé sur les options
   */
  private generateFilename(options: ExportOptions, extension: string): string {
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 10);

    switch (options.period) {
      case 'all':
        return `incidents-tous-${timestamp}.${extension}`;
      case 'current':
        return `incidents-filtres-${timestamp}.${extension}`;
      case 'year':
      case 'custom-year':
        return `incidents-${options.selectedYear || this.currentYear}-${timestamp}.${extension}`;
      case 'months':
        return `incidents-${options.selectedMonths || 3}mois-${timestamp}.${extension}`;
      case 'custom-range':
        return `incidents-${options.customStartDate}_${options.customEndDate}.${extension}`;
      default:
        return `incidents-${timestamp}.${extension}`;
    }
  }

  /**
   * Retourne le libellé de la période d'export
   */
  getExportPeriodLabel(options: ExportOptions): string {
    switch (options.period) {
      case 'all':
        return 'Tous les incidents';
      case 'current':
        return 'Incidents filtrés';
      case 'year':
        return `Année ${this.currentYear}`;
      case 'custom-year':
        return `Année ${options.selectedYear}`;
      case 'months':
        return `${options.selectedMonths} dernier(s) mois`;
      case 'custom-range':
        return options.customStartDate && options.customEndDate ?
          `Du ${options.customStartDate} au ${options.customEndDate}` :
          'Période personnalisée';
      default:
        return 'Non définie';
    }
  }

  /**
   * Compte le nombre d'incidents selon les options
   */
  getExportCount(incidents: Incident[], filteredIncidents: Incident[], options: ExportOptions): number {
    return this.getIncidentsForExport(incidents, filteredIncidents, options).length;
  }

  /**
   * Récupère les années disponibles dans les données
   */
  getAvailableYears(incidents: Incident[]): number[] {
    const years = new Set<number>();
    incidents.forEach(incident => {
      const incidentDate = this.parseDateString(incident.dateOuverture);
      if (incidentDate) {
        years.add(incidentDate.getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }
}