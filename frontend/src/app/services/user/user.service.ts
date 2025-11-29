// src/app/services/user/user.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { map, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { IncidentDataService } from '../incident-data/incident-data.service';
import { User } from '../../models/user.model';
import { Incident } from '../../models/incident.model';

import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService implements OnDestroy {
  private readonly apiUrl = environment.apiUrl;
  private readonly destroy$ = new Subject<void>();
  private readonly usersSubject = new BehaviorSubject<User[]>([]);
  public readonly users$ = this.usersSubject.asObservable();

  constructor(private http: HttpClient, private incidentDataService: IncidentDataService) {
    this.incidentDataService.incidents.pipe(
      map(incidents => this.extractUniqueUsers(incidents)),
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      takeUntil(this.destroy$)
    ).subscribe(users => {
      this.usersSubject.next(users);
    });
  }

  getAllUsersFromApi(): Observable<User[]> {
    return this.http.get<any>(`${this.apiUrl}/users`).pipe(
      map(response => response.data)
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.usersSubject.complete();
  }

  private extractUniqueUsers(incidents: Incident[]): User[] {
    const usersMap = new Map<number, User>();

    incidents.forEach(incident => {
      if (incident.creator && !usersMap.has(incident.creator.id)) {
        usersMap.set(incident.creator.id, incident.creator);
      }
      if (incident.assignee && !usersMap.has(incident.assignee.id)) {
        usersMap.set(incident.assignee.id, incident.assignee);
      }
    });

    return Array.from(usersMap.values());
  }

  public getAllUsers(): Observable<User[]> {
    return this.users$;
  }

}