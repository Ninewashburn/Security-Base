// src/app/components/role-modal/role-modal.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Role } from '../../../interfaces/role';
import { PermissionService } from '../../../services/permissions/permission.service';

interface Permission {
  key: keyof Role['permissions'];
  label: string;
  description: string;
  value: boolean;
  isLocked?: boolean;
  lockReason?: string;
}

interface PermissionCategory {
  name: string;
  permissions: Permission[];
}

@Component({
  selector: 'app-role-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './role-modal.html',
  styleUrls: ['./role-modal.scss']
})
export class RoleModal implements OnInit {
  @Input() role!: Role;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<Role>();

  saving = false;
  permissionCategories: PermissionCategory[] = [];

  // Permissions critiques qui ne peuvent jamais être désactivées pour certains rôles
  private criticalPermissions: Record<string, string[]> = {
    'admin': [
      'can_view_dashboard',    // Sinon l'admin ne peut plus accéder au dashboard
      'can_modify',            // Sinon l'admin ne peut plus modifier les rôles
      'can_view_all'           // Permission de base pour voir les données
    ],
    'responsable': ['can_view_all'],
    'technicien': ['can_view_all'],
    'animateur': ['can_view_all'],
    'consultant': ['can_view_all']
  };

  constructor(private permissionService: PermissionService) { }

  ngOnInit(): void {
    this.initializePermissions();
  }

  initializePermissions(): void {
    // Vérifier si c'est le rôle de l'utilisateur actuel
    const currentUser = this.permissionService.getAppUserSync();
    const currentUserRoleCode = currentUser ? currentUser.role_code : undefined;
    const isCurrentUserRole = currentUserRoleCode === this.role.code;

    // Liste des permissions critiques pour ce rôle
    const criticalForThisRole = this.criticalPermissions[this.role.code] || [];

    this.permissionCategories = [
      {
        name: 'Gestion des incidents',
        permissions: [
          {
            key: 'can_create',
            label: 'Créer un incident',
            description: 'Permet de créer un nouvel incident dans le système',
            value: this.role.permissions.can_create
          },
          {
            key: 'can_modify',
            label: 'Modifier un incident',
            description: 'Permet de modifier les détails d\'un incident existant',
            value: this.role.permissions.can_modify,
            isLocked: isCurrentUserRole && criticalForThisRole.includes('can_modify'),
            lockReason: 'Permission critique pour votre rôle'
          },
          {
            key: 'can_view_all',
            label: 'Consulter tous les incidents',
            description: 'Permet de consulter tous les incidents du système',
            value: this.role.permissions.can_view_all,
            isLocked: isCurrentUserRole && criticalForThisRole.includes('can_view_all'),
            lockReason: isCurrentUserRole && criticalForThisRole.includes('can_view_all')
              ? '⚠️ ATTENTION : Désactiver cette permission vous empêchera de voir le tableau de bord !'
              : undefined
          },
          {
            key: 'can_validate',
            label: 'Valider un incident',
            description: 'Permet de valider et approuver un incident',
            value: this.role.permissions.can_validate
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
            value: this.role.permissions.can_view_archives
          },
          {
            key: 'can_archive',
            label: 'Archiver un incident',
            description: 'Permet d\'archiver un incident terminé',
            value: this.role.permissions.can_archive
          },
          {
            key: 'can_unarchive',
            label: 'Désarchiver un incident',
            description: 'Permet de désarchiver un incident',
            value: this.role.permissions.can_unarchive
          },
          {
            key: 'can_view_trash',
            label: 'Consulter la corbeille',
            description: 'Permet de consulter les incidents supprimés',
            value: this.role.permissions.can_view_trash
          },
          {
            key: 'can_restore_from_trash',
            label: 'Restaurer de la corbeille',
            description: 'Permet de restaurer un incident supprimé',
            value: this.role.permissions.can_restore_from_trash
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
            value: this.role.permissions.can_soft_delete
          },
          {
            key: 'can_force_delete',
            label: 'Supprimer définitivement',
            description: 'Permet de supprimer définitivement un incident (irreversible)',
            value: this.role.permissions.can_force_delete
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
            value: this.role.permissions.can_view_dashboard,
            isLocked: isCurrentUserRole && criticalForThisRole.includes('can_view_dashboard'),
            lockReason: 'Vous perdriez l\'accès à cette interface !'
          },
          {
            key: 'can_manage_emails',
            label: 'Gérer les notifications emails',
            description: 'Permet de gérer les listes de diffusion email',
            value: this.role.permissions.can_manage_emails
          },
          {
            key: 'can_export',
            label: 'Exporter les données',
            description: 'Permet d\'exporter les incidents en CSV/Excel',
            value: this.role.permissions.can_export
          },
          {
            key: 'can_view_history',
            label: 'Consulter le journal',
            description: "Permet de consulter le journal des modifications d'un incident",
            value: this.role.permissions.can_view_history
          }
        ]
      }
    ];
  }

  get activeCount(): number {
    return this.permissionCategories
      .flatMap(cat => cat.permissions)
      .filter(p => p.value).length;
  }

  get inactiveCount(): number {
    return this.permissionCategories
      .flatMap(cat => cat.permissions)
      .filter(p => !p.value).length;
  }

  getCategoryActiveCount(category: PermissionCategory): number {
    return category.permissions.filter(p => p.value).length;
  }

  onPermissionChange(): void {
    // Mettre à jour l'objet role.permissions
    this.permissionCategories.forEach(category => {
      category.permissions.forEach(permission => {
        this.role.permissions[permission.key] = permission.value;
      });
    });
  }

  closeModal(): void {
    this.close.emit();
  }

  togglePermission(permission: any): void {
    if (!permission.isLocked) {
      permission.value = !permission.value;
      this.onPermissionChange();
    }
  }

  saveChanges(): void {
    // Vérification finale avant sauvegarde
    const currentUser = this.permissionService.getAppUserSync();
    const currentUserRoleCode = currentUser ? currentUser.role_code : undefined;
    const isCurrentUserRole = currentUserRoleCode === this.role.code;

    if (isCurrentUserRole) {
      const criticalForThisRole = this.criticalPermissions[this.role.code] || [];
      const missingCritical = criticalForThisRole.filter(
        key => !this.role.permissions[key as keyof Role['permissions']]
      );

      if (missingCritical.length > 0) {
        alert(
          `⚠️ ATTENTION : Vous ne pouvez pas désactiver ces permissions critiques pour votre propre rôle :\n\n` +
          `- ${missingCritical.join('\n- ')}\n\n` +
          `Vous risquez de perdre l'accès au système.`
        );
        return;
      }
    }

    this.saving = true;
    this.save.emit(this.role);
  }
}