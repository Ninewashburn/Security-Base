// src/app/models/user.model.ts
import { Metier } from './metier.model';

/**
 * Structure du rôle
 */
export interface UserRole {
  id: number;
  code: string;
  label: string;
  description: string;
}

/**
 * Interface User - Modèle interne de l'application
 * Accepte un rôle qui peut être un objet, une chaîne ou null.
 */
export interface User {
  id: number;
  login: string;
  name: string;
  full_name: string;
  email: string;
  
  // Informations personnelles
  prenom: string;
  nom: string;
  
  // Contexte professionnel
  role_label: string; // Libellé du rôle (ex: 'Administrateur')
  role_code: string; // Code du rôle (ex: 'admin')
  service: string;
  metier: Metier | null;
  siteImpacte?: string;
  department?: string;
  phone?: string;
  
  // Permissions structurées
  permissions: {
    can_create: boolean;
    can_modify: boolean;
    can_view_archives: boolean;
    can_view_trash: boolean;
    can_view_dashboard: boolean;
    can_soft_delete: boolean;
    can_force_delete: boolean;
    can_view_all: boolean;
    can_validate: boolean;
    can_manage_emails: boolean;
    can_export: boolean;
    can_archive: boolean;
    can_unarchive: boolean;
    can_restore_from_trash: boolean;
    can_view_history: boolean;
  };
  
  // Propriétés pour diffusion-list (optionnelles)
  ccOnly?: boolean;
  siteOnly?: boolean;
  
  // Métadonnées (optionnelles)
  last_login?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Interface UrssafUser - Données brutes de l'API URSSAF
 */
export interface UrssafUser {
  login: string;
  nom_util: string;
  pren_util: string;
  initiales: string | null;
  mail: string;
  num_court: string;
  tel: string;
  code_region: string;
  num_site: string;
  debut_embauche: string;
  fin_embauche: string | null;
  avatar: string;
  metier: Metier;
}

/**
 * Réponse du login
 */
export interface LoginResponse {
  token: string;
  user?: UrssafUser;
}

/**
 * Interface pour les données de diffusion (étend User)
 */
export interface DiffusionUser extends User {
  ccOnly: boolean;
  siteOnly: boolean;
  canReceiveAlerts: boolean;
  alertPreferences?: {
    gravity?: string[];
    domains?: string[];
    sites?: string[];
  };
}

/**
 * Filtres utilisateur
 */
export interface UserFilters {
  gravity?: string;
  domain?: string;
  site?: string;
  service?: string;
  searchTerm?: string;
}

/**
 * Pagination utilisateurs
 */
export interface UserPagination {
  currentPage: number;
  pageSize: number;
  totalUsers: number;
  totalPages: number;
}
