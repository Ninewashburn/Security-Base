import { TestBed } from '@angular/core/testing';

import { DataSortingService } from './data-sorting.service';

describe('DataSorting', () => {
  let service: DataSortingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DataSortingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
