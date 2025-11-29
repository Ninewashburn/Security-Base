// src/app/services/column-management/column-config.ts

export interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  width: number;
  minWidth: number;
  sortable: boolean;
  order: number;
}

export interface ColumnPreferences {
  columns: {
    key: string;
    visible: boolean;
    width: number;
    order: number;
  }[];
  timestamp: number;
}

export interface DragState {
  draggingColumn: string | null;
  dragOverColumn: string | null;
}

export interface ResizeState {
  resizingColumn: string | null;
  resizeStartX: number;
  resizeStartWidth: number;
}

export interface ColumnMenuState {
  show: boolean;
  position: { x: number; y: number };
}