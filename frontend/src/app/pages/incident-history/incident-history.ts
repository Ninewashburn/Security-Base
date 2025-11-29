// src/app/components/incident-history/incident-history.ts
import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IncidentHistoryService } from '../../services/incident-history/incident-history.service';
import { IncidentHistory } from '../../models/incident-history.model';
import { IncidentDisplayService } from '../../services/incident-display/incident-display.service';

@Component({
  selector: 'app-incident-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './incident-history.html',
  styleUrls: ['./incident-history.scss'],
})
export class IncidentHistoryComponent implements OnInit {
  @Input() incidentId!: number;

  histories: IncidentHistory[] = [];
  loading = true;
  error: string | null = null;
  private expandedIds = new Set<number>();

  constructor(
    private historyService: IncidentHistoryService,
    private incidentDisplayService: IncidentDisplayService
  ) { }

  ngOnInit(): void {
    if (!this.incidentId) {
      this.error = 'ID incident manquant';
      this.loading = false;
      return;
    }
    this.loadHistories();
  }

  loadHistories(): void {
    this.loading = true;
    this.error = null;

    this.historyService.getHistories(this.incidentId).subscribe({
      next: (histories) => {
        this.histories = histories;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement de l\'historique';
        this.loading = false;
        console.error('Erreur historique:', err);
      }
    });
  }

  isValueEmpty(value: any): boolean {
    return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
  }

  /**
   * Formate une valeur pour l'affichage dans le tableau Avant/Après.
   * Utilise IncidentDisplayService pour les dates.
   */
  formatChangeValue(value: any): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    // Dates
    if (typeof value === 'string' && (/^\d{2}\/\d{2}\/\d{4}/.test(value) || /^\d{4}-\d{2}-\d{2}/.test(value))) {
      return this.incidentDisplayService.formatDateTime(value);
    }

    // Booléens
    if (typeof value === 'boolean') {
      return value ? 'Oui' : 'Non';
    }

    // Tableaux
    if (Array.isArray(value)) {
      return value.join(', ');
    }

    return String(value);
  }

  /**
   * Formate une date en utilisant le service centralisé.
   */
  formatDate(date: string | Date): string {
    if (!date) return '';
    return this.incidentDisplayService.formatDateTime(date);
  }

  /**
   * Formate un snapshot complet pour l'affichage en utilisant le service centralisé.
   */
  formatSnapshotForDisplay(snapshot: any): string {
    if (!snapshot) return '{}';
    try {
      const snapshotCopy = JSON.parse(JSON.stringify(snapshot));
      const dateKeys = ['created_at', 'updated_at', 'dateOuverture', 'dateCloture', 'deleted_at', 'last_sync_at'];

      const formatDatesInObject = (obj: any) => {
        if (!obj || typeof obj !== 'object') return;
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            if (typeof value === 'string' && dateKeys.includes(key) && !value.includes('/')) {
              obj[key] = this.formatDate(value);
            } else if (typeof value === 'object') {
              formatDatesInObject(value);
            }
          }
        }
      };

      formatDatesInObject(snapshotCopy);
      return JSON.stringify(snapshotCopy, null, 2);
    } catch (e) {
      return JSON.stringify(snapshot, null, 2);
    }
  }

  // Map pour la traduction des clés de champ
  private fieldLabels: { [key: string]: string } = {
    'object': 'Objet',
    'domains': 'Domaines',
    'gravity': 'Gravité',
    'status': 'Statut',
    'dateOuverture': 'Date d\'ouverture',
    'dateCloture': 'Date de clôture',
    'isNational': 'Impact National',
    'ticketNumber': 'N° Ticket',
    'lienTicketHelpy': 'Lien Helpy',
    'lienTicketTandem': 'Lien Tandem',
    'meteo': 'Météo',
    'publicsImpactes': 'Publics impactés',
    'sitesImpactes': 'Sites impactés',
    'description': 'Description',
    'actionsMenees': 'Actions menées',
    'actionsAMener': 'Actions à mener',
    'tempsIndisponibilite': 'Temps indisponibilité',
    'mailAlerte': 'Emails alerte',
    'auto_notified_emails': 'Emails auto-notifiés',
    'template_excluded_emails': 'Emails template exclus',
    'created_by': 'Créateur',
    'assigned_to': 'Assigné à',
    'validateur_id': 'Validateur',
    'validation_status': 'Statut validation',
    'validated_at': 'Date validation',
    'template_id': 'ID Template',
    'template_actions': 'Actions Template',
    'archived': 'Archivé',
    'archived_at': 'Date archivage',
    'archived_by': 'Archivé par',
    'archiveReason': 'Raison archivage',
    'previousStatus': 'Statut précédent',
    'creator': 'Créateur',
    'assignee': 'Assigné à',
    'validator': 'Validateur',
    'template': 'Template',
    'user': 'Utilisateur',
    'created_at': 'Date de création',
    'updated_at': 'Date de modification',
    'deleted_at': 'Date de suppression',
  };

  /**
   * Retourne le libellé convivial d'un champ.
   */
  public getFieldLabel(key: string): string {
    return this.fieldLabels[key] || key;
  }

  /**
   * Toggle l'expansion d'une entrée d'historique
   */
  toggleExpand(id: number): void {
    if (this.expandedIds.has(id)) {
      this.expandedIds.delete(id);
    } else {
      this.expandedIds.add(id);
    }
  }

  /**
   * Vérifie si une entrée est dépliée
   */
  isExpanded(id: number): boolean {
    return this.expandedIds.has(id);
  }

  /**
   * Retourne l'icône appropriée pour une action
   */
  getActionIcon(action: string): string {
    const icons: { [key: string]: string } = {
      'created': '✨',
      'updated': '✏️',
      'closed': '✅',
      'archived': '📦',
      'restored_archive': '📤',
      'trashed': '🗑️',
      'restored_trash': '♻️',
      'validated': '✔️',
      'downgraded': '⬇️'
    };
    return icons[action] || '📝';
  }

  /**
    * Retourne la couleur appropriée pour une action
    */
  getActionColor(action: string): string {
    const colors: { [key: string]: string } = {
      'created': '#10b981',      // green
      'updated': '#3b82f6',      // blue
      'closed': '#059669',       // emerald
      'archived': '#6b7280',     // gray
      'restored_archive': '#8b5cf6', // purple
      'trashed': '#ef4444',      // red
      'restored_trash': '#10b981', // green
      'validated': '#059669',    // emerald
      'downgraded': '#f59e0b'    // amber
    };
    return colors[action] || '#6b7280';
  }
}