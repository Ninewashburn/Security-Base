// src/app/interfaces/filter-config.ts
import { GravityLevel, IncidentStatus } from '../models/incident.model';

export interface IncidentDisplayData {
  id: number | undefined;
  object: string;
  objectFull: string;
  domains: string;
  domainsCount: number;
  gravity: {
    value: GravityLevel;
    label: string;
    icon: string;
    textClass: string;
  };
  status: {
    value: IncidentStatus;
    label: string;
    icon: string;
    textClass: string;
    bgClass: string;
  };
  dates: {
    ouverture: string;
    ouvertureTime: string;
    ouvertureRelative: string;
    cloture: string;
    clotureTime: string;
  };
  sites: string;
  sitesCount: number;
  publics: string;
  publicsCount: number;
  redacteur_id: number;
  description: string;
  ticketNumber: string;
}
