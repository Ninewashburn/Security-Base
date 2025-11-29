// src/app/interfaces/pagination-config.ts
export interface PaginationState {
  currentPage: number;
  pageSize: number;
  showAllResults: boolean;
  totalItems: number;
}

export interface PaginationConfig {
  defaultPageSize: number;
  availablePageSizes: number[];
  showAllOption: boolean;
  maxVisiblePages: number;
  ellipsisThreshold: number;
}

export interface PaginationInfo {
  startIndex: number;
  endIndex: number;
  totalItems: number;
  currentPage: number;
  totalPages: number;
  displayText: string;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationInfo;
}

export const DEFAULT_PAGINATION_CONFIG: PaginationConfig = {
  defaultPageSize: 10,
  availablePageSizes: [5, 10, 15, 20, 50, 100],
  showAllOption: true,
  maxVisiblePages: 7,
  ellipsisThreshold: 6
};

export type PageSizeOption = number | 'all';