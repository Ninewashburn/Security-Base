// src/app/services/app-config/app-config.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { GravityLevel, IncidentStatus } from '../../models/incident.model';

// ===== INTERFACES DE CONFIGURATION =====

export interface DomainOption {
  value: string;
  label: string;
  shortLabel: string;
  description?: string;
  color?: string;
  category?: 'security' | 'production' | 'hr';
}

export interface GravityOption {
  value: GravityLevel;
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  priority: number;
  autoNotification?: boolean;
}

export interface StatusOption {
  value: IncidentStatus;
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  workflow?: {
    canTransitionTo: IncidentStatus[];
    requiresComment: boolean;
  };
}

export interface SiteOption {
  value: string;
  label: string;
  shortLabel: string;
  region: 'auvergne' | 'national';
  code?: string;
  coordinates?: { lat: number; lng: number };
  contact?: string;
}

export interface PublicOption {
  value: string;
  label: string;
  description: string;
  icon: string;
  notificationLevel: 'low' | 'medium' | 'high';
}

export interface AppConfiguration {
  domains: DomainOption[];
  gravity: GravityOption[];
  status: StatusOption[];
  sites: SiteOption[];
  publics: PublicOption[];
  metadata: {
    version: string;
    lastUpdated: Date;
    environment: 'development' | 'staging' | 'production';
  };
}

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {

  constructor() {
    this.initializeConfig();
  }

  // ===== CONFIGURATION CENTRALISÉE =====

  private readonly defaultConfig: AppConfiguration = {
    domains: [
      {
        value: 'Biens & personnes',
        label: 'Biens & personnes',
        shortLabel: 'Biens & personnes',
        description: 'Incidents liés à la sécurité physique, accès, personnel',
        color: 'blue',
        category: 'security'
      },
      {
        value: 'Production',
        label: 'Production',
        shortLabel: 'Production',
        description: 'Incidents liés aux systèmes de production, applications métier',
        color: 'green',
        category: 'production'
      },
      {
        value: 'Sécurité du système d\'information',
        label: 'Sécurité du système d\'information',
        shortLabel: 'Sécurité SI',
        description: 'Incidents liés à la cybersécurité, infrastructure IT',
        color: 'red',
        category: 'security'
      }
    ],

    gravity: [
      {
        value: 'faible',
        label: 'Faible',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        icon: '🟢',
        priority: 1,
        autoNotification: false
      },
      {
        value: 'moyen',
        label: 'Moyen',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        icon: '🟡',
        priority: 2,
        autoNotification: false
      },
      {
        value: 'grave',
        label: 'Grave',
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        icon: '🟠',
        priority: 3,
        autoNotification: true
      },
      {
        value: 'tres_grave',
        label: 'Très grave',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        icon: '🔴',
        priority: 4,
        autoNotification: true
      }
    ],

    status: [
      {
        value: 'en_cours',
        label: 'En cours',
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        icon: '🔄',
        workflow: {
          canTransitionTo: ['cloture'],
          requiresComment: false
        }
      },
      {
        value: 'cloture',
        label: 'Cloturé',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        icon: '',
        workflow: {
          canTransitionTo: ['en_cours'],
          requiresComment: true
        }
      },
      {
        value: 'archive',
        label: 'Archivé',
        color: 'text-gray-500',
        bgColor: 'bg-gray-100',
        icon: '🗄️',
        workflow: {
          canTransitionTo: ['cloture'],
          requiresComment: false
        }
      },
      {
        value: 'en_attente',
        label: 'En attente',
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-100',
        icon: '',
        workflow: {
          canTransitionTo: ['cloture'],
          requiresComment: false
        }
      }
    ],
    
    sites: [
      // Région Auvergne
      {
        value: 'Clermont-Ferrand',
        label: 'Clermont-Ferrand',
        shortLabel: 'Clermont-Fd',
        region: 'auvergne',
        code: '63',
        coordinates: { lat: 45.7772, lng: 3.0870 },
        contact: 'ur63.support@test.fr'
      },
      {
        value: 'Aurillac',
        label: 'Aurillac',
        shortLabel: 'Aurillac',
        region: 'auvergne',
        code: '15',
        coordinates: { lat: 44.9317, lng: 2.4434 },
        contact: 'ur15.support@test.fr'
      },
      {
        value: 'Le Puy-en-Velay',
        label: 'Le Puy-en-Velay',
        shortLabel: 'Le Puy',
        region: 'auvergne',
        code: '43',
        coordinates: { lat: 45.0439, lng: 3.8859 },
        contact: 'ur43.support@test.fr'
      },
      {
        value: 'Moulins',
        label: 'Moulins',
        shortLabel: 'Moulins',
        region: 'auvergne',
        code: '03',
        coordinates: { lat: 46.5653, lng: 3.3347 },
        contact: 'ur03.support@test.fr'
      },
      // National
      {
        value: 'Centre PAJEMPLOI',
        label: 'Centre PAJEMPLOI',
        shortLabel: 'PAJEMPLOI',
        region: 'national',
        code: 'PAJ',
        contact: 'pajemploi.support@test.fr'
      },
      {
        value: 'CNV (Centre National de Validation)',
        label: 'CNV (Centre National de Validation)',
        shortLabel: 'CNV',
        region: 'national',
        code: 'CNV',
        contact: 'cnv.support@test.fr'
      }
    ],

    publics: [
      {
        value: 'Cotisants',
        label: 'Cotisants',
        description: 'Entreprises et travailleurs indépendants',
        icon: '🏢',
        notificationLevel: 'high'
      },
      {
        value: 'Personnels',
        label: 'Personnels',
        description: 'Agents et collaborateurs',
        icon: '👥',
        notificationLevel: 'medium'
      },
      {
        value: 'Partenaires',
        label: 'Partenaires',
        description: 'Organismes partenaires et prestataires',
        icon: '🤝',
        notificationLevel: 'low'
      }
    ],

    metadata: {
      version: '1.0.0',
      lastUpdated: new Date(),
      environment: 'development'
    }
  };

  // ===== ÉTAT RÉACTIF =====

  private configSubject = new BehaviorSubject<AppConfiguration>(this.defaultConfig);
  public config$ = this.configSubject.asObservable();

  // ===== MÉTHODES D'ACCÈS PRINCIPALES =====

  /**
   * Obtient la configuration complète
   */
  getConfig(): AppConfiguration {
    return this.configSubject.value;
  }

  /**
   * Obtient toutes les options de domaines
   */
  getDomains(): DomainOption[] {
    return this.configSubject.value.domains;
  }

  /**
   * Obtient toutes les options de gravité
   */
  getGravityLevels(): GravityOption[] {
    return this.configSubject.value.gravity;
  }

  /**
   * Obtient toutes les options de statut
   */
  getStatusTypes(): StatusOption[] {
    return this.configSubject.value.status;
  }

  /**
   * Obtient toutes les options de sites
   */
  getSites(): SiteOption[] {
    return this.configSubject.value.sites;
  }

  /**
   * Obtient toutes les options de publics
   */
  getPublics(): PublicOption[] {
    return this.configSubject.value.publics;
  }

  // ===== MÉTHODES POUR LES FORMULAIRES =====

  /**
   * Obtient les options formatées pour un select
   */
  getSelectOptions(type: 'domains' | 'gravity' | 'status' | 'sites' | 'publics'): { value: any; label: string }[] {
    const config = this.configSubject.value;

    switch (type) {
      case 'domains':
        return config.domains.map(d => ({ value: d.value, label: d.label }));
      case 'gravity':
        return config.gravity.map(g => ({ value: g.value, label: g.label }));
      case 'status':
        return config.status.map(s => ({ value: s.value, label: s.label }));
      case 'sites':
        return config.sites.map(s => ({ value: s.value, label: s.label }));
      case 'publics':
        return config.publics.map(p => ({ value: p.value, label: p.label }));
      default:
        return [];
    }
  }

  /**
   * Obtient les options groupées pour les sites
   */
  getGroupedSiteOptions(): { label: string; options: { value: string; label: string }[] }[] {
    const config = this.configSubject.value;

    return [
      {
        label: 'Région Auvergne',
        options: config.sites
          .filter(s => s.region === 'auvergne')
          .map(s => ({ value: s.value, label: s.label }))
      },
      {
        label: 'FR National',
        options: config.sites
          .filter(s => s.region === 'national')
          .map(s => ({ value: s.value, label: s.label }))
      }
    ];
  }

  // ===== MÉTHODES DE RECHERCHE =====

  /**
   * Trouve une option par valeur
   */
  findDomain(value: string): DomainOption | undefined {
    return this.configSubject.value.domains.find(d => d.value === value);
  }

  findGravity(value: GravityLevel): GravityOption | undefined {
    return this.configSubject.value.gravity.find(g => g.value === value);
  }

  findStatus(value: IncidentStatus): StatusOption | undefined {
    return this.configSubject.value.status.find(s => s.value === value);
  }

  findSite(value: string): SiteOption | undefined {
    return this.configSubject.value.sites.find(s => s.value === value);
  }

  findPublic(value: string): PublicOption | undefined {
    return this.configSubject.value.publics.find(p => p.value === value);
  }

  // ===== MÉTHODES DE FORMATAGE =====

  /**
   * Formate les publics multiples pour affichage
   */
  formatMultiplePublics(publics: string[]): string {
    if (!publics || publics.length === 0) return '-';
    if (publics.length === 1) return publics[0];
    if (publics.length <= 2) return publics.join(', ');

    return `${publics[0]} +${publics.length - 1}`;
  }

  // ===== MÉTHODES DE VALIDATION =====

  /**
   * Valide si une valeur est autorisée
   */
  isValidDomain(value: string): boolean {
    return this.configSubject.value.domains.some(d => d.value === value);
  }

  isValidGravity(value: string): boolean {
    return this.configSubject.value.gravity.some(g => g.value === value);
  }

  isValidStatus(value: string): boolean {
    return this.configSubject.value.status.some(s => s.value === value);
  }

  isValidSite(value: string): boolean {
    return this.configSubject.value.sites.some(s => s.value === value);
  }

  isValidPublic(value: string): boolean {
    return this.configSubject.value.publics.some(p => p.value === value);
  }

  // ===== MÉTHODES AVANCÉES =====

  /**
   * Obtient les sites par région
   */
  getSitesByRegion(region: 'auvergne' | 'national'): SiteOption[] {
    return this.configSubject.value.sites.filter(siteImpacte => siteImpacte.region === region);
  }

  /**
   * Obtient les domaines par catégorie
   */
  getDomainsByCategory(category: 'security' | 'production' | 'hr'): DomainOption[] {
    return this.configSubject.value.domains.filter(domain => domain.category === category);
  }

  /**
   * Obtient les gravités qui déclenchent des notifications automatiques
   */
  getAutoNotificationGravities(): GravityOption[] {
    return this.configSubject.value.gravity.filter(g => g.autoNotification);
  }

  /**
   * Vérifie si une transition de statut est autorisée
   */
  canTransitionStatus(from: IncidentStatus, to: IncidentStatus): boolean {
    const fromStatus = this.findStatus(from);
    return fromStatus?.workflow?.canTransitionTo.includes(to) ?? false;
  }

  /**
   * Vérifie si une transition nécessite un commentaire
   */
  requiresCommentForTransition(from: IncidentStatus, to: IncidentStatus): boolean {
    if (!this.canTransitionStatus(from, to)) return false;
    const toStatus = this.findStatus(to);
    return toStatus?.workflow?.requiresComment ?? false;
  }

  // ===== RECHERCHE GLOBALE =====

  /**
   * Recherche dans toutes les configurations
   */
  searchInAllConfig(searchTerm: string): any {
    const term = searchTerm.toLowerCase();
    const config = this.configSubject.value;

    return {
      domains: config.domains.filter(d =>
        d.label.toLowerCase().includes(term) ||
        d.shortLabel.toLowerCase().includes(term) ||
        (d.description?.toLowerCase().includes(term) ?? false)
      ),
      sites: config.sites.filter(s =>
        s.label.toLowerCase().includes(term) ||
        s.shortLabel.toLowerCase().includes(term) ||
        s.code?.toLowerCase().includes(term)
      ),
      publics: config.publics.filter(p =>
        p.label.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term)
      ),
      gravity: config.gravity.filter(g =>
        g.label.toLowerCase().includes(term)
      ),
      status: config.status.filter(s =>
        s.label.toLowerCase().includes(term)
      )
    };
  }

  // ===== GESTION DE LA CONFIGURATION =====

  /**
   * Met à jour une partie de la configuration
   */
  updateConfig(updates: Partial<AppConfiguration>): void {
    const currentConfig = this.configSubject.value;
    const newConfig = { ...currentConfig, ...updates };

    // Mettre à jour les métadonnées
    newConfig.metadata = {
      ...newConfig.metadata,
      lastUpdated: new Date()
    };

    this.configSubject.next(newConfig);
    this.saveToLocalStorage();
  }

  /**
   * Ajoute un domaine
   */
  addDomain(domain: DomainOption): void {
    const currentConfig = this.configSubject.value;
    const newDomains = [...currentConfig.domains, domain];
    this.updateConfig({ domains: newDomains });
  }

  /**
   * Ajoute un site
   */
  addSite(siteImpacte: SiteOption): void {
    const currentConfig = this.configSubject.value;
    const newSites = [...currentConfig.sites, siteImpacte];
    this.updateConfig({ sites: newSites });
  }

  // ===== PERSISTANCE =====

  private saveToLocalStorage(): void {
    const config = this.configSubject.value;
    localStorage.setItem('security-base-app-config', JSON.stringify(config));
  }

  private loadFromLocalStorage(): void {
    const saved = localStorage.getItem('security-base-app-config');
    if (saved) {
      const config = JSON.parse(saved);
      this.configSubject.next({ ...this.defaultConfig, ...config });
    }
  }

  /**
   * Remet la configuration par défaut
   */
  resetToDefault(): void {
    this.configSubject.next({ ...this.defaultConfig });
    this.saveToLocalStorage();
  }

  // ===== UTILITAIRES =====

  /**
   * Obtient les statistiques de configuration
   */
  getConfigStats(): any {
    const config = this.configSubject.value;

    return {
      domains: config.domains.length,
      gravityLevels: config.gravity.length,
      statusTypes: config.status.length,
      sites: config.sites.length,
      publics: config.publics.length,
      auvergneSites: config.sites.filter(s => s.region === 'auvergne').length,
      nationalSites: config.sites.filter(s => s.region === 'national').length,
      autoNotificationGravities: config.gravity.filter(g => g.autoNotification).length,
      securityDomains: config.domains.filter(d => d.category === 'security').length,
      version: config.metadata.version,
      lastUpdated: config.metadata.lastUpdated
    };
  }

  // ===== INITIALISATION =====

  private initializeConfig(): void {
    // Charger la configuration sauvegardée
    this.loadFromLocalStorage();
  }
}