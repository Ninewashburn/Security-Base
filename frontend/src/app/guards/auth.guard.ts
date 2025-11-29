// src/app/guards/auth.guard.ts
import { inject } from '@angular/core';
import { AuthService } from '../services/auth/auth.service';
import { NotificationService } from '../services/notification/notification.service';
import { map, take } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';

export const authGuard = () => {
  const authService = inject(AuthService);
  const notificationService = inject(NotificationService);
  const router = inject(Router);

  return authService.isAuthenticated$.pipe(
    take(1),
    map(isAuthenticated => {
      if (isAuthenticated) {
        return true;
      }
      notificationService.warning('Session expirée', 'Votre session a expiré. Veuillez vous reconnecter.');

      localStorage.setItem('intendedUrl', router.url); // Ou window.location.pathname + window.location.search
      // Redirection directe vers le SSO Laravel
      window.location.href = `${environment.apiUrl}/auth/sso-login`;

      return false;
    })
  );
};