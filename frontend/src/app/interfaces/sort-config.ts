// src/app/interfaces/sort-config.ts
export interface SortState {
  column: string;
  direction: 'asc' | 'desc';
}

export interface SortableColumn {
  key: string;
  sortable: boolean;
  sortFunction?: (a: any, b: any) => number;
}

export interface SortConfig {
  defaultColumn: string;
  defaultDirection: 'asc' | 'desc';
  sortableColumns: SortableColumn[];
}

// Configuration des icônes de tri
export interface SortIcons {
  neutral: string;
  ascending: string;
  descending: string;
}

export const DEFAULT_SORT_ICONS: SortIcons = {
  neutral: '↕️',
  ascending: '⬆️',
  descending: '⬇️'
};