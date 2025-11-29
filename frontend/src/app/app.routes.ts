// src/app.routes.ts
import { Routes } from '@angular/router';
import { IncidentDetail } from './pages/incident-detail/incident-detail';
import { IncidentCreate } from './pages/incident-create/incident-create';
import { IncidentUpdate } from './pages/incident-update/incident-update';
import { Dashboard } from './pages/dashboard/dashboard';
import { permissionGuard } from './guards/permission.guard';
import { authGuard } from './guards/auth.guard';
import { ValidatingComponent } from './pages/validating/validating';

export const routes: Routes = [

  {
    path: '',
    redirectTo: '/incidents',
    pathMatch: 'full'
  },

  {
    path: 'auth/validating',
    component: ValidatingComponent
  },

  {
    path: 'incidents',
    loadComponent: () => import('./pages/incidents/incidents').then(m => m.Incidents),
    canActivate: [authGuard] // Tous les connectés peuvent voir
  },

  {
    path: 'incident/create',
    component: IncidentCreate,
    canActivate: [
      authGuard,
      permissionGuard(auth => auth.canCreateIncident())
    ]
  },

  {
    path: 'incident/:id',
    component: IncidentDetail,
    canActivate: [authGuard] // Tous les connectés peuvent voir
  },

  {
    path: 'incident/:id/update',
    component: IncidentUpdate,
    canActivate: [
      authGuard,
      permissionGuard(auth => auth.canModifyIncident())
    ]
  },

  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [
      authGuard,
      permissionGuard(auth => auth.canViewDashboard())
    ]
  },

  {
    path: '**',
    redirectTo: '/incidents'
  }
];
