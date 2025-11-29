// src/app/services/incident-template.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface IncidentTemplate {
  id: number;
  nom_objet: string;
  description?: string;
  actions?: any[];
  actions_count?: number;
  diffusion_list_id?: number | null;
  diffusion_list_emails?: string[];
}

export interface TemplateAction {
  id?: number;
  action: string;
  responsable?: string;
  delai?: string;
  obligatoire?: boolean;
}

export interface CreateTemplateRequest {
  nom_objet: string;
  description?: string;
  actions: TemplateAction[];
  diffusion_list_id?: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class IncidentTemplateService {
  private apiUrl = `${environment.apiUrl}/incident-templates`;

  // Cache des templates pour la liste déroulante
  private templatesSubject = new BehaviorSubject<IncidentTemplate[]>([]);
  public templates$ = this.templatesSubject.asObservable();

  constructor(private http: HttpClient) { }

  /**
   * Récupérer tous les templates actifs (pour dropdown)
   */
  getActiveTemplates(): Observable<{ success: boolean, data: IncidentTemplate[], count: number }> {
    return this.http.get<{ success: boolean, data: IncidentTemplate[], count: number }>(this.apiUrl)
      .pipe(
        tap(response => {
          if (response.success) {
            this.templatesSubject.next(response.data);
          }
        }),
        catchError(error => {
          console.error('Erreur récupération templates:', error);
          throw error;
        })
      );
  }

  /**
   * Récupérer un template avec ses actions
   */
  getTemplate(id: number): Observable<{ success: boolean, data: IncidentTemplate }> {
    return this.http.get<{ success: boolean, data: IncidentTemplate }>(`${this.apiUrl}/${id}`);
  }

  /**
   * Créer un nouveau template
   */
  createTemplate(template: CreateTemplateRequest): Observable<{ success: boolean, message: string, data: any }> {
    return this.http.post<{ success: boolean, message: string, data: any }>(this.apiUrl, template)
      .pipe(
        tap(response => {
          if (response.success) {
            // Recharger la liste après création
            this.refreshTemplates();
          }
        })
      );
  }

  /**
   * Modifier un template
   */
  updateTemplate(id: number, template: CreateTemplateRequest): Observable<{ success: boolean, message: string }> {
    return this.http.put<{ success: boolean, message: string }>(`${this.apiUrl}/${id}`, template)
      .pipe(
        tap(response => {
          if (response.success) {
            this.refreshTemplates();
          }
        })
      );
  }

  /**
   * Supprimer un template
   */
  deleteTemplate(id: number): Observable<{ success: boolean, message: string }> {
    return this.http.delete<{ success: boolean, message: string }>(`${this.apiUrl}/${id}`)
      .pipe(
        tap(response => {
          if (response.success) {
            this.refreshTemplates();
          }
        })
      );
  }

  /**
   * Recharger les templates depuis l'API
   */
  refreshTemplates(): void {
    this.getActiveTemplates().subscribe();
  }

  /**
   * Obtenir les templates actuellement en cache
   */
  getCurrentTemplates(): IncidentTemplate[] {
    return this.templatesSubject.value;
  }

  /**
   * Vider le cache
   */
  clearCache(): void {
    this.templatesSubject.next([]);
  }

}