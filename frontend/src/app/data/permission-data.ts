// src/app/data/permission-data.ts
import { Role } from "../interfaces/role";

export interface PermissionDetail {
  key: keyof Role['permissions'];
  label: string;
  description: string;
}

export interface PermissionCategory {
  name: string;
  permissions: PermissionDetail[];
}

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    name: 'Gestion des incidents',
    permissions: [
      {
        key: 'can_create',
        label: 'Créer un incident',
        description: 'Permet de créer un nouvel incident dans le système',
      },
      {
        key: 'can_modify',
        label: 'Modifier un incident',
        description: 'Permet de modifier les détails d\'un incident existant',
      },
      {
        key: 'can_view_all',
        label: 'Consulter tous les incidents',
        description: 'Permet de consulter tous les incidents du système',
      },
      {
        key: 'can_validate',
        label: 'Valider un incident',
        description: 'Permet de valider et approuver un incident',
      }
    ]
  },
  {
    name: 'Archives et corbeille',
    permissions: [
      {
        key: 'can_view_archives',
        label: 'Consulter les archives',
        description: 'Permet de consulter les incidents archivés',
      },
      {
        key: 'can_archive',
        label: 'Archiver un incident',
        description: 'Permet d\'archiver un incident terminé',
      },
      {
        key: 'can_unarchive',
        label: 'Désarchiver un incident',
        description: 'Permet de désarchiver un incident',
      },
      {
        key: 'can_view_trash',
        label: 'Consulter la corbeille',
        description: 'Permet de consulter les incidents supprimés',
      },
      {
        key: 'can_restore_from_trash',
        label: 'Restaurer de la corbeille',
        description: 'Permet de restaurer un incident supprimé',
      }
    ]
  },
  {
    name: 'Suppression',
    permissions: [
      {
        key: 'can_soft_delete',
        label: 'Supprimer (corbeille)',
        description: 'Permet de supprimer un incident (envoi en corbeille)',
      },
      {
        key: 'can_force_delete',
        label: 'Supprimer définitivement',
        description: 'Permet de supprimer définitivement un incident (irreversible)',
      }
    ]
  },
  {
    name: 'Autres fonctionnalités',
    permissions: [
      {
        key: 'can_view_dashboard',
        label: 'Accéder au tableau de bord',
        description: 'Permet d\'accéder au tableau de bord administrateur',
      },
      {
        key: 'can_manage_emails',
        label: 'Gérer les notifications emails',
        description: 'Permet de gérer les listes de diffusion email',
      },
      {
        key: 'can_export',
        label: 'Exporter les données',
        description: 'Permet d\'exporter les incidents en CSV/Excel',
      },
      {
        key: 'can_view_history',
        label: 'Consulter le journal',
        description: "Permet de consulter le journal des modifications d'un incident",
      }
    ]
  }
];

export const ALL_PERMISSIONS: PermissionDetail[] = PERMISSION_CATEGORIES.flatMap(category => category.permissions);
