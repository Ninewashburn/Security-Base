// src/app/models/incident.history.ts

export interface IncidentHistory {
  id: number;
  action: HistoryAction;
  action_label: string;
  user: {
    id: number | null;
    name: string;
    email: string | null;
  };
  snapshot: any; // État complet de l'incident à ce moment
  changes?: HistoryChange[] | null;
  reason?: string | null;
  created_at: string;
  created_at_human: string;
}

export type HistoryAction = 
  | 'created' 
  | 'updated' 
  | 'closed' 
  | 'archived' 
  | 'restored_archive' 
  | 'trashed' 
  | 'restored_trash';

export interface HistoryChange {
  field_key: string;
  field: string;
  old_value: any;
  new_value: any;
}

export interface HistoryApiResponse {
  data: IncidentHistory[];
}