// services/metier-role.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MetierRoleService {
  private apiUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  getMetiersWithRoles(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/metiers-with-roles`);
  }

  associateRoles(roleId: number | null, metierNums: number[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/metiers/associate-role`, {
      role_id: roleId,
      metier_nums: metierNums
    });
  }

  removeAssociation(numMetier: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/metiers/${numMetier}/role`);
  }
}