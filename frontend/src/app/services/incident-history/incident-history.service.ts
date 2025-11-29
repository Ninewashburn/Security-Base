// src/app/services/incident-history.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { IncidentHistory, HistoryApiResponse } from '../../models/incident-history.model';

@Injectable({
  providedIn: 'root'
})
export class IncidentHistoryService {
  private apiUrl = `${environment.apiUrl}/incidents`;

  constructor(private http: HttpClient) {}

  /**
   * Récupérer tout l'historique d'un incident
   */
  getHistories(incidentId: number): Observable<IncidentHistory[]> {
    return this.http
      .get<HistoryApiResponse>(`${this.apiUrl}/${incidentId}/histories`)
      .pipe(map(response => response.data));
  }

  /**
   * Récupérer un historique spécifique
   */
  getHistory(incidentId: number, historyId: number): Observable<IncidentHistory> {
    return this.http
      .get<{ data: IncidentHistory }>(`${this.apiUrl}/${incidentId}/histories/${historyId}`)
      .pipe(map(response => response.data));
  }
}