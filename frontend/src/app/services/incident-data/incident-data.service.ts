// src/app/services/incident-data/incident-data.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { NotificationService } from '../notification/notification.service';
import { Incident, IncidentStatus, GravityLevel, IncidentFormData } from '../../models';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class IncidentDataService {

  private readonly apiUrl = `${environment.apiUrl}/incidents`;
  private incidents$ = new BehaviorSubject<Incident[]>([]);
  public incidents = this.incidents$.asObservable();

  constructor(private http: HttpClient, private notificationService: NotificationService, private authService: AuthService) { }

  // ===== CHARGEMENT DES DONNÉES =====

  /**
   * Charge les incidents avec ou sans filtres
   */
  public loadIncidents(filters?: {
    search?: string;
    status?: string;
    gravite?: string;
    siteImpacte?: string;
    showArchived?: boolean;
  }, forceReload: boolean = false): Observable<Incident[]> {

    if (!forceReload && this.incidents$.value.length > 0) {
      return this.incidents$;
    }

    let params = new HttpParams();

    // Filtrer les archivés par défaut
    const showArchived = filters?.showArchived === true || filters?.status === 'archive';
    params = params.set('show_archived', showArchived.toString());

    return this.http.get<{ data: Incident[], meta?: any }>(this.apiUrl, { params }).pipe(
      map(response => {
        let incidents = response.data.map(incident => ({
          ...incident,
          dateOuverture: this.parseDateString(incident.dateOuverture),
          dateCloture: this.parseDateString(incident.dateCloture),
          archived_at: this.parseDateString(incident.archived_at),
          gravity: this.validateGravityLevel(incident.gravity),
          status: incident.status as IncidentStatus
        })) as unknown as Incident[];

        // Filtrer côté client aussi
        if (!showArchived) {
          incidents = incidents.filter(incident => incident.status !== 'archive');
        }

        this.incidents$.next(incidents);
        return incidents;
      }),
      catchError((err: HttpErrorResponse) => {
        console.error('IncidentDataService: Error loading incidents:', err);
        return throwError(() => new Error('Failed to load incidents'));
      })
    );
  }

  /**
   * Parse une chaîne de date (potentiellement JJ/MM/AAAA) en objet Date.
   */
  private parseDateString(date: string | Date | undefined | null): Date | undefined {
    if (!date) return undefined;
    if (date instanceof Date) return date;

    if (typeof date === 'string') {
      const parts = date.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/);
      if (parts) {
        return new Date(+parts[3], +parts[2] - 1, +parts[1], +parts[4], +parts[5]);
      } else {
        try {
          const d = new Date(date);
          return isNaN(d.getTime()) ? undefined : d;
        } catch {
          return undefined;
        }
      }
    }
    return undefined;
  }

  /**
   * MÉTHODES DE CONVENANCE
   */
  public loadActiveIncidents(): Observable<Incident[]> {
    return this.loadIncidents({ showArchived: false });
  }

  loadArchivedIncidents(): Observable<Incident[]> {
    return this.loadIncidents({ showArchived: true, status: 'archive' });
  }

  // ===== CRUD STANDARD =====

  createIncident(incident: IncidentFormData): Observable<Incident> {
  const currentUser = this.authService.getCurrentUser();

  if (!currentUser) {
    return throwError(() => new Error('User not authenticated'));
  }

  const dataToSend = {
    ...incident,
    dateOuverture: incident.dateOuverture ? new Date(incident.dateOuverture).toISOString() : null,
    dateCloture: incident.dateCloture ? new Date(incident.dateCloture).toISOString() : null,

    // Utiliser les propriétés de User au lieu de UrssafUser
    created_by_login: currentUser.login,
    created_by_name: currentUser.full_name || `${currentUser.prenom} ${currentUser.nom}`,
    created_by_email: currentUser.email
  };

  return this.http.post<{ data: Incident }>(this.apiUrl, dataToSend).pipe(
    map(response => this.formatIncident(response.data)),
    tap((newIncident) => {
      // Ajouter immédiatement à la liste locale
      const currentIncidents = this.incidents$.value;
      this.incidents$.next([newIncident, ...currentIncidents]);
    }),
    catchError((err: HttpErrorResponse) => {
      console.error('IncidentDataService: Error creating incident:', err);
      return throwError(() => new Error('Failed to create incident'));
    })
  );
}

  getIncidentById(id: number): Observable<Incident> {
    const cachedIncident = this.getIncidentFromCache(id);
    if (cachedIncident && cachedIncident.description !== undefined) {
      return new Observable(observer => {
        observer.next(cachedIncident);
        observer.complete();
      });
    }

    return this.http.get<{ data: Incident }>(`${this.apiUrl}/${id}`).pipe(
      map(response => this.formatIncident(response.data)),
      catchError((err: HttpErrorResponse) => {
        console.error('IncidentDataService: Error loading incident by ID:', err);
        return throwError(() => new Error('Failed to load incident'));
      })
    );
  }

  getIncidentFromCache(id: number): Incident | undefined {
    return this.incidents$.value.find(incident => incident.id === id);
  }

  // ===== CRUD - UPDATE =====

  updateIncident(id: number, incident: IncidentFormData): Observable<Incident> {
  const currentUser = this.authService.getCurrentUser();

  if (!currentUser) {
    return throwError(() => new Error('User not authenticated'));
  }

  const dataToSend = {
    ...incident,
    dateOuverture: incident.dateOuverture ? new Date(incident.dateOuverture).toISOString() : null,
    dateCloture: incident.dateCloture ? new Date(incident.dateCloture).toISOString() : null,

    // Utiliser les propriétés de User au lieu de UrssafUser
    assigned_to_login: currentUser.login,
    assigned_to_name: currentUser.full_name || `${currentUser.prenom} ${currentUser.nom}`,
    assigned_to_email: currentUser.email
  };

  return this.http.patch<{ data: Incident }>(`${this.apiUrl}/${id}`, dataToSend).pipe(
    map(response => this.formatIncident(response.data)),
    tap((updatedIncident) => {
      const currentIncidents = this.incidents$.value;

      // Si l'incident devient archivé, le retirer de la liste
      if (updatedIncident.status === 'archive') {
        const filteredIncidents = currentIncidents.filter(i => i.id !== updatedIncident.id);
        this.incidents$.next(filteredIncidents);
      } else {
        // Sinon, mise à jour normale
        const index = currentIncidents.findIndex(i => i.id === updatedIncident.id);
        if (index !== -1) {
          currentIncidents[index] = updatedIncident;
          this.incidents$.next([...currentIncidents]);
        }
      }
    }),
    catchError((err: HttpErrorResponse) => {
      console.error('IncidentDataService: Error updating incident:', err);
      return throwError(() => new Error('Failed to update incident'));
    })
  );
}

  // ===== ARCHIVAGE =====

  archiveIncident(id: number): Observable<Incident> {
    // Suppression immédiate de la vue
    this.removeIncident(id);

    return this.http.patch<{ data: Incident }>(`${this.apiUrl}/${id}/archive`, {}).pipe(
      map(response => this.formatIncident(response.data)),
      catchError((error) => {
        // En cas d'erreur, recharger la liste pour restaurer l'état correct
        this.loadIncidents({}, true).subscribe();
        return this.handleError(error);
      })
    );
  }

  unarchiveIncident(id: number): Observable<Incident> {
    return this.http.patch<{ data: Incident }>(`${this.apiUrl}/${id}/unarchive`, {}).pipe(
      map(response => this.formatIncident(response.data)),
      tap((restoredIncident) => {
        const currentIncidents = this.incidents$.getValue();
        // Vérifier que l'incident n'existe pas déjà avant de l'ajouter
        const exists = currentIncidents.some(i => i.id === restoredIncident.id);
        if (!exists) {
          this.incidents$.next([restoredIncident, ...currentIncidents]);
        }
      }),
      catchError(this.handleError)
    );
  }

  // ===== CORBEILLE =====

  softDeleteIncident(id: number): Observable<void> {
    // SUPPRESSION IMMÉDIATE de la vue (optimistic update)
    this.removeIncident(id);

    return this.http.patch<void>(`${this.apiUrl}/${id}/soft-delete`, {}).pipe(
      tap(() => {
        // Notification de succès
        this.notificationService.success('Incident déplacé', "L'incident a été mis à la corbeille.");
      }),
      catchError((error) => {
        // En cas d'erreur, recharger la liste pour restaurer l'incident
        console.error('Erreur lors du soft delete, restauration de la vue:', error);
        this.loadIncidents({}, true).subscribe();
        return this.handleError(error);
      })
    );
  }

  getTrashedIncidents(): Observable<Incident[]> {
    return this.http.get<{ data: Incident[] }>(`${this.apiUrl}/trashed`).pipe(
      map(response => {
        return response.data.map(incident => this.formatIncident(incident));
      }),
      catchError(this.handleError)
    );
  }

  restoreTrashedIncident(id: number): Observable<boolean> {
    return this.http.post<{ data: Incident }>(`${this.apiUrl}/${id}/restore`, {}).pipe(
      map(() => {
        return true;
      }),
      catchError(this.handleError)
    );
  }

  deleteTrashedIncident(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/trashed/${id}`);
  }

  // ===== VALIDATION =====

  validateIncident(incidentId: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${incidentId}/validate`, {}).pipe(
      tap(() => {
        // Mettre à jour l'incident dans la liste locale
        const currentIncidents = this.incidents$.value;
        const index = currentIncidents.findIndex(i => i.id === incidentId);
        if (index !== -1) {
          const updatedIncident = {
            ...currentIncidents[index],
            validated: true,
            validated_at: new Date().toISOString(),
            status: 'en_cours' as IncidentStatus
          };
          currentIncidents[index] = updatedIncident;
          this.incidents$.next([...currentIncidents]);
        }
      }),
      catchError(this.handleError)
    );
  }

  // ===== MÉTHODES UTILITAIRES PRIVÉES =====

  /**
   * Supprime un incident de la liste locale
   */
  private removeIncident(id: number): void {
    const currentIncidents = this.incidents$.getValue();
    const updatedIncidents = currentIncidents.filter((i: Incident) => i.id !== id);
    this.incidents$.next(updatedIncidents);
  }

  private formatIncident(incident: any): Incident {
    const parseJsonArray = (field: any): string[] => {
      if (Array.isArray(field)) return field;
      if (typeof field === 'string') {
        try {
          const parsed = JSON.parse(field);
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          return [];
        }
      }
      return [];
    };

    return {
      ...incident,
      dateOuverture: new Date(incident.dateOuverture),
      dateCloture: incident.dateCloture ? new Date(incident.dateCloture) : undefined,
      archived_at: incident.archived_at ? new Date(incident.archived_at) : undefined,
      actionsAMener: parseJsonArray(incident.actionsAMener),
      actionsMenees: parseJsonArray(incident.actionsMenees),
    };
  }

  private handleError = (error: HttpErrorResponse) => {
    console.error(`Backend returned code ${error.status}, body was: `, error.error);
    this.notificationService.error('Erreur API', error.error.message || 'Une erreur est survenue');
    return throwError(() => new Error('Something bad happened; please try again later.'));
  }

  private validateGravityLevel(gravity: any): GravityLevel {
    const validLevels: GravityLevel[] = ['faible', 'moyen', 'grave', 'tres_grave'];
    return validLevels.includes(gravity) ? gravity : 'faible';
  }

  getAllIncidents(): Observable<Incident[]> {
    return this.incidents$;
  }

}