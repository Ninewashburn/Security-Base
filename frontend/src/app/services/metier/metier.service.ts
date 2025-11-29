// src/app/services/metier/metier.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, map, of, catchError } from 'rxjs';
import { Metier, MetierWithRole } from '../../models/metier.model';
import { environment } from '../../../environments/environment';

// Interface pour la réponse API
// interface MetiersApiResponse {
//   metiers?: Metier[];
//   // Parfois l'API peut retourner directement un tableau
//   // Nous gérons les deux cas
// }

@Injectable({
  providedIn: 'root'
})
export class MetierService {
  private readonly apiUrl = environment.apiUrl;

  // Cache optionnel des métiers (liste rarement modifiée)
  private metiersSubject = new BehaviorSubject<MetierWithRole[] | null>(null);
  public metiers$ = this.metiersSubject.asObservable();

  constructor(private http: HttpClient) { }

  /**
   * Récupérer la liste des métiers URSSAF
   * @param forceRefresh Force le rechargement même si cache existant
   */
  getMetiers(forceRefresh = false): Observable<MetierWithRole[]> {
    const cached = this.metiersSubject.value;
    if (!forceRefresh && cached && cached.length > 0) {
      return this.metiers$ as Observable<MetierWithRole[]>;
    }

    // Utiliser withCredentials (envoie les cookies de session Laravel)
    return this.http.get<any>(`${this.apiUrl}/metiers-with-roles`, {
      withCredentials: true // ← Envoie les cookies Laravel
    }).pipe(
      map(response => {
        // Gère la nouvelle structure { data: { metiers: [...] } }
        if (response?.data?.metiers && Array.isArray(response.data.metiers)) {
          return response.data.metiers;
        }

        // Anciennes vérifications (gardées pour la robustesse)
        if (Array.isArray(response)) {
          return response;
        } else if (response.metiers && Array.isArray(response.metiers)) {
          return response.metiers;
        } else if (response.data && Array.isArray(response.data)) {
          return response.data;
        } else {
          console.error('❌ Format inconnu:', response);
          return [];
        }
      }),
      tap(metiers => {
        this.metiersSubject.next(metiers);
      }),
      catchError(error => {
        console.error('❌ Erreur chargement métiers:', error);
        return of([]);
      })
    );
  }

  /**
   * Retourne le nom du métier pour affichage, ou une chaîne par défaut.
   * @param metier L'objet Metier (peut être undefined ou null)
   */
  getMetierLabel(metier: Metier | undefined | null): string {
    return metier?.nom_metier || 'Pas de métier';
  }

  /**
   * Rechercher des métiers par nom (recherche partielle)
   */
  searchMetiersByName(searchTerm: string): Metier[] {
    const metiers = this.metiersSubject.value;
    if (!metiers) return [];

    const term = searchTerm.toLowerCase();
    return metiers.filter(m =>
      m.nom_metier.toLowerCase().includes(term)
    );
  }

  /**
   * Vider le cache
   */
  clearCache(): void {
    this.metiersSubject.next(null);
  }
}