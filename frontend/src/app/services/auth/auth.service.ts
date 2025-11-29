// src/app/services/auth/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { User } from '../../models/user.model';
import { environment } from '../../../environments/environment';

interface AuthMeResponse {
  authenticated: boolean;
  user?: User;
  token?: string;
}

interface VerifyTokenResponse {
  status: string;
  message?: string;
  new_token?: string;
  data?: {
    user?: User;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = environment.apiUrl;

  private tokenSubject = new BehaviorSubject<string | null>(null);
  private userSubject = new BehaviorSubject<User | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

  // Observables publics
  public token$ = this.tokenSubject.asObservable();
  public user$ = this.userSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadFromSession();
  }

  /*
  |--------------------------------------------------------------------------
  | VALIDATION SESSION SSO
  |--------------------------------------------------------------------------
  */

  /**
   * Valide la session après retour du SSO URSSAF
   * Récupère l'utilisateur, son rôle et le token JWT
   */
  validateSession(): Observable<{ authenticated: boolean, user?: User, token?: string }> {
    return this.http.get<AuthMeResponse>(
      `${this.apiUrl}/auth/me`,
      {
        withCredentials: true,
        headers: new HttpHeaders({
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        })
      }
    ).pipe(
      map(response => {
        if (response.authenticated && response.user) {
          const user = this.normalizeUser(response.user);

          if (!response.token) {
            console.warn('Token manquant dans la réponse /auth/me');
          }

          return {
            authenticated: true,
            user,
            token: response.token
          };
        }

        return { authenticated: false };
      }),
      tap(response => {
        if (response.authenticated && response.user) {
          if (response.token) {
            this.setToken(response.token);
          }
          this.setUser(response.user);
          this.checkAndRedirectToIntendedUrl();
        }
      }),
      catchError(error => {
        console.error('Erreur lors de la validation de session:', error);
        return of({ authenticated: false });
      })
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Normalisation de User
  |--------------------------------------------------------------------------
  */

  /**
   * Normalise les données utilisateur en format User
   * Compatible avec les formats legacy et modernes
   */
  private normalizeUser(rawUser: any): User {
    const user: User = {
      id: parseInt(rawUser.login?.replace(/\D/g, '')) || 0,
      login: rawUser.login || '',
      name: rawUser.login || '',
      full_name: rawUser.full_name || `${rawUser.pren_util || rawUser.prenom || ''} ${rawUser.nom_util || rawUser.nom || ''}`.trim(),
      email: rawUser.mail || rawUser.email || '',
      prenom: rawUser.pren_util || rawUser.prenom || '',
      nom: rawUser.nom_util || rawUser.nom || '',
      phone: rawUser.tel || rawUser.phone || '',
      department: rawUser.code_region || rawUser.department || '',
      service: rawUser.code_region || rawUser.service || '',
      siteImpacte: rawUser.num_site || rawUser.siteImpacte || '',
      metier: rawUser.metier || null,
      role_code: rawUser.role?.code || 'aucun',
      role_label: rawUser.role_label || 'Aucun rôle',
      permissions: rawUser.permissions || {
        can_create: false,
        can_modify: false,
        can_view_archives: false,
        can_view_trash: false,
        can_view_dashboard: false,
        can_soft_delete: false,
        can_force_delete: false,
        can_view_all: false,
        can_validate: false,
        can_manage_emails: false,
        can_export: false,
        can_archive: false,
        can_unarchive: false,
        can_restore_from_trash: false,
        can_view_history: false
      }
    };

    return user;
  }

  /*
  |--------------------------------------------------------------------------
  | GESTION SESSION
  |--------------------------------------------------------------------------
  */

  /**
   * Stocke le token JWT dans la session
   */
  setToken(token: string): void {
    this.tokenSubject.next(token);
    this.isAuthenticatedSubject.next(true);
    sessionStorage.setItem('jwt_token', token);
  }

  /**
   * Stocke l'utilisateur dans la session
   */
  setUser(user: User): void {
    this.userSubject.next(user);
    this.isAuthenticatedSubject.next(true);
    sessionStorage.setItem('current_user', JSON.stringify(user));
  }

  /**
   * Récupère le token JWT
   */
  getToken(): string | null {
    return this.tokenSubject.value;
  }

  /**
   * Récupère l'utilisateur courant
   */
  getCurrentUser(): User | null {
    return this.userSubject.value;
  }

  /**
   * Vérifie si l'utilisateur est authentifié
   */
  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  /**
   * Obtient le nom complet de l'utilisateur pour affichage
   */
  getUserDisplayName(): string {
    const user = this.getCurrentUser();
    if (!user) return 'Utilisateur inconnu';
    return user.full_name || `${user.prenom} ${user.nom}`;
  }

  /**
   * Vérifie et rafraîchit le token via le middleware URSSAF
   * Le middleware retourne automatiquement un nouveau token si nécessaire
   */
  refreshToken(): Observable<{ token: string }> {
    const currentToken = this.getToken();

    if (!currentToken) {
      throw new Error('Pas de token à rafraîchir');
    }

    return this.http.post<VerifyTokenResponse>(
      `${this.apiUrl}/auth/verify-token`,
      { token: currentToken },
      {
        headers: new HttpHeaders({
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        })
      }
    ).pipe(
      map(response => {
        // Nouveau token fourni (proche de l'expiration)
        if (response.status === 'success' && response.new_token) {
          this.setToken(response.new_token);

          // Mise à jour utilisateur si fourni
          if (response.data?.user) {
            this.setUser(this.normalizeUser(response.data.user));
          }

          return { token: response.new_token };
        }

        // Token actuel encore valide
        if (response.status === 'success') {
          return { token: currentToken };
        }

        // Erreur
        throw new Error(response.message || 'Token invalide');
      }),
      catchError(error => {
        console.error('Erreur lors du renouvellement du token:', error);
        throw error;
      })
    );
  }

  /*
  |--------------------------------------------------------------------------
  | DÉCONNEXION & RECONNEXION
  |--------------------------------------------------------------------------
  */

  /**
   * Déconnexion complète de l'utilisateur
   */
  logout(): void {
    this.tokenSubject.next(null);
    this.userSubject.next(null);
    this.isAuthenticatedSubject.next(false);

    sessionStorage.removeItem('jwt_token');
    sessionStorage.removeItem('current_user');

    this.router.navigate(['/']);
  }

  /**
   * Gère la redirection après une connexion réussie.
   * Redirige vers l'URL prévue si elle existe, sinon laisse la navigation par défaut.
   */
  public checkAndRedirectToIntendedUrl(): void {
    const intendedUrl = localStorage.getItem('intendedUrl');
    if (intendedUrl) {
      localStorage.removeItem('intendedUrl'); // Nettoyer pour les prochaines connexions
      this.router.navigateByUrl(intendedUrl);
    }
  }

  /**
   * Reconnexion : Déconnecte puis redirige vers le SSO
   */
  reconnect(): void {
    if (confirm('Voulez-vous vraiment vous reconnecter ?')) {
      this.logout();

      setTimeout(() => {
        const ssoUrl = `${environment.apiUrl}/auth/sso-login`;
        window.location.href = ssoUrl;
      }, 300);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | SESSION STORAGE
  |--------------------------------------------------------------------------
  */

  /**
   * Charge le token et l'utilisateur depuis sessionStorage au démarrage
   */
  private loadFromSession(): void {
    const token = sessionStorage.getItem('jwt_token');
    const userJson = sessionStorage.getItem('current_user');

    if (token) {
      this.tokenSubject.next(token);
      this.isAuthenticatedSubject.next(true);
    }

    if (userJson) {
      try {
        const rawUser = JSON.parse(userJson);
        const user = this.normalizeUser(rawUser);
        this.userSubject.next(user);
      } catch (e) {
        console.error('Erreur lors du parsing des données utilisateur:', e);
      }
    }
  }
}