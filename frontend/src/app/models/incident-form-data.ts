// src/app/models/incident-form-data.ts
import { GravityLevel, IncidentStatus } from '../models/incident.model';

export interface IncidentFormData {
    object: string;
    domains: string[];
    gravity: GravityLevel;
    status: IncidentStatus;
    dateOuverture?: Date;
    dateCloture?: Date;
    isNational: boolean;
    ticketNumber?: string;
    lienTicketHelpy?: string;
    lienTicketTandem?: string;
    meteo?: boolean;
    publicsImpactes: string[];
    sitesImpactes: string[];
    description: string;
    actionsMenees: string[];
    actionsAMener: string[];
    tempsIndisponibilite?: string;
    mailAlerte: string[];
    auto_notified_emails?: string[];
    template_id?: number; 
    template_diffusion_emails?: string[];
    template_excluded_emails?: string[];
}