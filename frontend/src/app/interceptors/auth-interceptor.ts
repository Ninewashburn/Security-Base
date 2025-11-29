// src/app/interceptors/auth-interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, switchMap } from 'rxjs';
import { AuthService } from '../services/auth/auth.service';
import { NotificationService } from '../services/notification/notification.service';
import { ActivityTrackerService } from '../services/activity-tracker/activity-tracker.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const notificationService = inject(NotificationService);
  const activityTracker = inject(ActivityTrackerService);

  const token = authService.getToken();

  // Ajouter le token aux requêtes API
  if (token && req.url.includes('/api/')) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {

      if (error.status === 401) {

        // Éviter la boucle infinie sur l'endpoint de refresh
        if (req.url.includes('/auth/verify-token')) {
          notificationService.error(
            'Session expirée',
            'Impossible de renouveler votre session. Veuillez vous reconnecter.'
          );
          authService.logout();
          router.navigate(['/']);
          return throwError(() => error);
        }

        const isActive = activityTracker.isUserActive();

        // Si utilisateur actif → tenter refresh automatique
        if (isActive) {
          return authService.refreshToken().pipe(
            switchMap(response => {
              // Refresh réussi → Retry la requête avec le nouveau token
              const clonedReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${response.token}`
                }
              });
              return next(clonedReq);
            }),
            catchError(refreshError => {
              // Refresh échoué → Déconnexion
              console.error('Erreur lors du renouvellement du token:', refreshError);
              notificationService.error(
                'Session expirée',
                'Impossible de renouveler votre session. Veuillez vous reconnecter.'
              );
              authService.logout();
              router.navigate(['/']);
              return throwError(() => refreshError);
            })
          );
        }

        // Utilisateur inactif → Déconnexion directe
        notificationService.error(
          'Session expirée',
          'Votre session a expiré suite à une inactivité prolongée.'
        );
        authService.logout();
        router.navigate(['/']);
      }

      return throwError(() => error);
    })
  );
};