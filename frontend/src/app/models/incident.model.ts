// src/app/models/incident.model.ts
import { User } from './user.model';

export interface Incident {
  // ==================== CHAMPS TABLEAU PRINCIPAL ====================
  id: number;
  object: string;                    // Titre de l'incident - num_fiches en base
  domains: string[];                 // Multi-domaines (évolution de la liste unique)
  gravity: GravityLevel;             // 4 niveaux colorés
  status: IncidentStatus;            // En cours/Cloturé/Archivé/En attente
  dateOuverture: string;              // Auto-générée à la création
  dateCloture?: string;               // Nullable, remplie à la clôture
  isNational: boolean;              // Affichage "Oui" si true, vide si false - portée nationale en base
  ticketNumber?: string;            // Format UR***-I0****** ou vide
  lienTicketHelpy?: string;         // Lien vers le ticket Helpy (format URL)
  lienTicketTandem?: string;        // Lien vers le ticket Tandem (format URL)
  redacteur_id: number;             // ID du créateur de l'incident
  intervenant_id?: number;          // ID du dernier modificateur de l'incident

  // Propriétés calculées par le backend (via IncidentResource)
  has_pending_actions?: boolean;
  notified_emails?: { email: string, source: 'automatique' | 'manuel' }[];      // Vrai si des actions sont à mener
  updated_at: string;                  // Date de dernière modification

  creator?: User; // Relation avec l'utilisateur créateur
  assignee?: User; // Relation avec l'utilisateur assigné
  lastModifier?: User; // Relation avec le dernier modificateur

  // ==================== CHAMPS SUPPLÉMENTAIRES (PDF/MODAL) ====================
  meteo?: boolean;                  // OUI/NON - Indicateur météo
  publicsImpactes: string[];        // Multi-sélection : Cotisants, Personnels, Partenaires
  sitesImpactes: string[];         // Multi-sélection sites géographiques

  // Champs texte enrichi (WYSIWYG)
  description: string;              // Description détaillée de l'incident
  actionsMenees: string[];           // Actions menées (maintenant un tableau)
  actionsAMener: string[];           // Actions à mener (maintenant un tableau)
  tempsIndisponibilite?: string;   // Temps d'indisponibilité du service
  mailAlerte?: string[];
  auto_notified_emails?: string[];
  deleted_at?: string;               // Date de suppression douce (soft delete)
  archived?: boolean;              // Indique si l'incident est archivé
  archived_at?: string;              // Date d'archivage
  archived_by?: string;            // Utilisateur qui a archivé l'incident
  archiveReason?: string;         // Raison de l'archivage
  previousStatus?: IncidentStatus;  // Statut de l'incident avant archivage

  // Champs pour la validation
  validated?: boolean;            // Indique si l'incident grave est validé
  validated_at?: string;          // Date de validation (ISO string)
  validated_by?: number;          // ID de l'utilisateur validateur

  // Champ pour le lien avec le template
  template_id?: number;           // ID du template utilisé pour créer l'incident
  template_diffusion_emails?: string[]; // Emails du template pour cet incident
  template_excluded_emails?: string[]; // Emails du template exclus par l'utilisateur
}

// Types énumérés pour la gravité
export type GravityLevel = 'faible' | 'moyen' | 'grave' | 'tres_grave';

// Types pour le statut
export type IncidentStatus = 'en_cours' | 'cloture' | 'archive' | 'en_attente';

// Interface pour la configuration d'un statut
export interface StatusConfigOption {
  label: string;
  colorClass: string;
  priority: number;
}

// Configuration des couleurs de gravité pour les badges visuels
export const GRAVITY_CONFIG: Record<GravityLevel, { label: string; colorClass: string; priority: number }> = {
  faible: {
    label: 'Faible',
    colorClass: 'bg-sky-300 text-sky-900',
    priority: 1
  },
  moyen: {
    label: 'Moyen',
    colorClass: 'bg-yellow-300 text-yellow-900',
    priority: 2
  },
  grave: {
    label: 'Grave',
    colorClass: 'bg-orange-400 text-orange-900',
    priority: 3
  },
  tres_grave: {
    label: 'Très grave',
    colorClass: 'bg-red-400 text-red-900',
    priority: 4
  }
} as const;

// Configuration des statuts avec couleurs et priorité de tri
export const STATUS_CONFIG: Record<IncidentStatus, StatusConfigOption> = {
  en_attente: {
    label: 'En attente',
    colorClass: 'bg-yellow-400 text-yellow-900',
    priority: 4
  },
  en_cours: {
    label: 'En cours',
    colorClass: 'bg-orange-400 text-orange-900',
    priority: 3
  },
  cloture: {
    label: 'Cloturé',
    colorClass: 'bg-green-500 text-green-900',
    priority: 2
  },
  archive: {
    label: 'Archivé',
    colorClass: 'bg-gray-500 text-gray-900',
    priority: 1
  }
} as const;