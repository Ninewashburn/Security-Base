// src/app/interfaces/filter-config.ts
export interface AdvancedFilters {
  id: string;
  object: string;
  domain: string;
  gravity: string;
  status: string;
  siteImpacte: string;
  redacteur_id?: string | number | null;
  intervenant_id?: string | number | null;
  dateFrom: string;
  dateTo: string;
}

export interface ActiveFilter {
  label: string;
  value: string;
  type: 'search' | 'filter';
  key?: string;
}

export interface FilterState {
  searchTerm: string;
  advancedFilters: AdvancedFilters;
  showAdvancedFilters: boolean;
}