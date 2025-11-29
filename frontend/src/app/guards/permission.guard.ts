// src/app/guards/permission.guard.ts

import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { PermissionService } from '../services/permissions/permission.service';
import { NotificationService } from '../services/notification/notification.service';

export const permissionGuard = (checkFn: (permission: PermissionService) => boolean) => {
  return () => {
    const permissionService = inject(PermissionService);
    const router = inject(Router);
    const notificationService = inject(NotificationService);

    // Appel synchrone
    const hasPermission = checkFn(permissionService);

    if (hasPermission) {
      return true;
    }

    notificationService.error('Accès refusé', 'Vous n\'avez pas les permissions nécessaires pour accéder à cette page.');
    router.navigate(['/incidents']);
    return false;
  };
};