// src/app/services/auth/permission.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';
import { User } from '../../models/user.model';
import { Role } from '../../interfaces/role';
import { Observable, BehaviorSubject, map, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {

  private apiUrl = `${environment.apiUrl}/roles`;

  // Cache des rôles
  private rolesSubject = new BehaviorSubject<Role[]>([]);
  public roles$ = this.rolesSubject.asObservable();

  private rolesLoaded = false;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.loadRoles().subscribe();
  }

  // Plus de logique métier, juste récupérer l'utilisateur
  getAppUser(): Observable<User | null> {
    return this.authService.user$;
  }

  getAppUserSync(): User | null {
    return this.authService.getCurrentUser();
  }

  // Gestion des rôles (CRUD) - inchangé
  loadRoles(forceRefresh = false): Observable<Role[]> {
    if (!forceRefresh && this.rolesLoaded && this.rolesSubject.value.length > 0) {
      return this.roles$;
    }

    return this.http.get<Role[]>(this.apiUrl).pipe(
      tap(roles => {
        this.rolesSubject.next(roles);
        this.rolesLoaded = true;
      }),
      catchError(error => {
        console.error('❌ Erreur chargement rôles:', error);
        return of([]);
      })
    );
  }

  updateRole(id: number, updates: Partial<Role>): Observable<Role> {
    return this.http.patch<{ message: string; role: Role }>(`${this.apiUrl}/${id}`, updates).pipe(
      map(response => response.role),
      tap(updatedRole => {
        const currentRoles = this.rolesSubject.value;
        const index = currentRoles.findIndex(r => r.id === id);
        if (index !== -1) {
          currentRoles[index] = updatedRole;
          this.rolesSubject.next([...currentRoles]);
        }
      })
    );
  }

  // Vérifications de permissions (inchangé)
  canCreateIncident(): boolean {
    return this.getAppUserSync()?.permissions.can_create ?? false;
  }

  canModifyIncident(): boolean {
    return this.getAppUserSync()?.permissions.can_modify ?? false;
  }

  canViewArchives(): boolean {
    return this.getAppUserSync()?.permissions.can_view_archives ?? false;
  }

  canViewTrash(): boolean {
    return this.getAppUserSync()?.permissions.can_view_trash ?? false;
  }

  canViewDashboard(): boolean {
    return this.getAppUserSync()?.permissions.can_view_dashboard ?? false;
  }

  canSoftDeleteIncident(): boolean {
    return this.getAppUserSync()?.permissions.can_soft_delete ?? false;
  }

  canForceDeleteIncident(): boolean {
    return this.getAppUserSync()?.permissions.can_force_delete ?? false;
  }

  canViewAllIncidents(): boolean {
    return this.getAppUserSync()?.permissions.can_view_all ?? false;
  }

  canValidateIncidents(): boolean {
    return this.getAppUserSync()?.permissions.can_validate ?? false;
  }

  canManageEmails(): boolean {
    return this.getAppUserSync()?.permissions.can_manage_emails ?? false;
  }

  canExportData(): boolean {
    return this.getAppUserSync()?.permissions.can_export ?? false;
  }

  canArchiveIncidents(): boolean {
    return this.getAppUserSync()?.permissions.can_archive ?? false;
  }

  canUnarchiveIncidents(): boolean {
    return this.getAppUserSync()?.permissions.can_unarchive ?? false;
  }

  canRestoreFromTrash(): boolean {
    return this.getAppUserSync()?.permissions.can_restore_from_trash ?? false;
  }

  canViewHistory(): boolean {
    return this.getAppUserSync()?.permissions.can_view_history ?? false;
  }

  hasRole(...roles: string[]): boolean {
    const appUser = this.getAppUserSync();
    if (!appUser) return false;

    const userRoleCode = appUser.role_code;

    return roles.includes(userRoleCode ?? '');
  }
}