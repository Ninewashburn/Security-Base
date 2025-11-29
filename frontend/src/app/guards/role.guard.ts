// src/app/guards/role.guard.ts
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { PermissionService } from '../services/permissions/permission.service';
import { take, map } from 'rxjs';

/**
 * Guard de vérification de rôle
 * Vérifie si l'utilisateur a un des rôles autorisés
 */
export const roleGuard = (allowedRoles: string[]) => {
  return () => {
    const permissionService = inject(PermissionService);
    const router = inject(Router);

    return permissionService.getAppUser().pipe(
      take(1),
      map(appUser => {
        // Si pas d'utilisateur ou pas de rôle, on bloque
        if (!appUser || !appUser.role_code) {
          router.navigate(['/']);
          return false;
        }

        // Extraire le code du rôle (gère string, objet, ou null)
        const roleCode = typeof appUser.role_code === 'string' ? appUser.role_code : appUser.role_code;

        // Vérifier si le rôle est autorisé
        if (!allowedRoles.includes(roleCode)) {
          router.navigate(['/']);
          return false;
        }
        
        return true;
      })
    );
  };
};