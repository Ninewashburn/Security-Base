// src/app/services/incident-display/incident-display.service.ts
import { Injectable } from '@angular/core';
import { IncidentStatus, GRAVITY_CONFIG, STATUS_CONFIG } from '../../models';

export interface DisplayFormatters {
  date: (date: Date) => string;
  time: (date: Date) => string;
  domain: (domain: string) => string;
  siteImpacte: (siteImpacte: string | undefined) => string;
}

export interface StatusDisplayConfig {
  textClass: string;
  bgClass: string;
  icon: string;
}

@Injectable({
  providedIn: 'root'
})
export class IncidentDisplayService {

  constructor() { }

  readonly gravityConfig = GRAVITY_CONFIG;
  readonly statusConfig = STATUS_CONFIG;

  // ===== FORMATTERS DE DATES =====

  /**
   * Formate une date au format court français (DD/MM/YYYY)
   */
  formatDateShort(date: string | Date | null | undefined): string {
    const dateObj = this.parseDateString(date);
    if (!dateObj) return '-';
    
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    
    return `${day}/${month}/${year}`;
  }

  /**
   * Formate une heure au format court (HH:MM)
   */
  formatTimeShort(date: string | Date | null | undefined): string {
    const dateObj = this.parseDateString(date);
    if (!dateObj) return '-';
    
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    
    return `${hours}:${minutes}`;
  }

  /**
   * Formate une date complète avec heure (DD/MM/YYYY HH:MM)
   */
  formatDateTime(date: string | Date | null | undefined): string {
    const dateObj = this.parseDateString(date);
    if (!dateObj) return '-';
    
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  /**
   * Parse une chaîne de date en objet Date SANS conversion de timezone.
   * Gère les formats:
   * - DD/MM/YYYY HH:mm (depuis Laravel formaté)
   * - YYYY-MM-DD HH:mm:ss (depuis Laravel brut)
   * - ISO 8601 avec T
   */
  private parseDateString(date: string | Date | undefined | null): Date | null {
    if (!date) return null;
    if (date instanceof Date) return date;

    if (typeof date === 'string') {
      // Format DD/MM/YYYY HH:mm (déjà formaté par Laravel)
      const frenchFormat = date.match(/(\d{2})\/(\d{2})\/(\d{4})(?: (\d{2}):(\d{2}))?/);
      if (frenchFormat) {
        const [, day, month, year, hours = '0', minutes = '0'] = frenchFormat;
        return new Date(+year, +month - 1, +day, +hours, +minutes);
      }

      // Format YYYY-MM-DD HH:mm:ss ou YYYY-MM-DDTHH:mm:ss (ISO depuis base)
      const isoFormat = date.match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
      if (isoFormat) {
        const [, year, month, day, hours, minutes] = isoFormat;
        // Parser SANS passer par new Date(string) qui applique UTC
        return new Date(+year, +month - 1, +day, +hours, +minutes);
      }

      // Format YYYY-MM-DD sans heure
      const dateOnlyFormat = date.match(/(\d{4})-(\d{2})-(\d{2})$/);
      if (dateOnlyFormat) {
        const [, year, month, day] = dateOnlyFormat;
        return new Date(+year, +month - 1, +day);
      }

      // Fallback : essayer de parser directement
      try {
        const d = new Date(date);
        return isNaN(d.getTime()) ? null : d;
      } catch {
        return null;
      }
    }
    
    return null;
  }
  
  // ===== FORMATTERS DE DOMAINES ET SITES =====

  getShortDomain(domain: string): string {
    const shortcuts: { [key: string]: string } = {
      'Biens et personnes': 'Biens & personnes',
      'Production': 'Production',
      'Sécurité du système d\'information': 'Sécurité SI'
    };
    return shortcuts[domain] || domain;
  }

  getShortSiteImpacte(siteImpacte: string | undefined): string {
    if (!siteImpacte) return '-';

    const shortcuts: { [key: string]: string } = {
      'Site d\'Aurillac': 'Aurillac',
      'Site de la Haute-Loire': 'Haute-Loire',
      'Site de Moulins': 'Moulins',
      'Clermont-Ferrand': 'Clermont-Fd',
      'Le Puy-en-Velay': 'Le Puy',
      'Centre PAJEMPLOI': 'PAJEMPLOI',
      'Centre National de Validation': 'CNV',
      'CNV (Centre National de Validation)': 'CNV'
    };
    return shortcuts[siteImpacte] || siteImpacte;
  }

  // ===== FORMATTERS DE STATUT ET GRAVITÉ =====

  getStatusTextClass(status: IncidentStatus): string {
    const statusClasses: { [key in IncidentStatus]: string } = {
      'en_cours': 'text-orange-600',
      'cloture': 'text-green-600',
      'archive': 'text-gray-600',
      'en_attente': 'text-yellow-600'
    };
    return statusClasses[status];
  }

  getStatusBgClass(status: IncidentStatus): string {
    const statusClasses: { [key in IncidentStatus]: string } = {
      'en_cours': 'bg-orange-100',
      'cloture': 'bg-green-100',
      'archive': 'bg-gray-100',
      'en_attente': 'bg-yellow-100'
    };
    return statusClasses[status];
  }

  // ===== FORMATTERS DE CONTENU =====

  formatPublicsImpactes(publics: string[]): string {
    if (!publics || publics.length === 0) return '-';
    if (publics.length === 1) return publics[0];
    if (publics.length <= 2) return publics.join(', ');

    return `${publics[0]} +${publics.length - 1}`;
  }
}