//src/app/interfaces/role.ts
export interface Role {
  id: number;
  code: string;
  label: string;
  description: string;
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
}