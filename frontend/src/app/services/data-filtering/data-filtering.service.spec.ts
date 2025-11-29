import { TestBed } from '@angular/core/testing';

import { DataFilteringService } from './data-filtering.service';

describe('DataFiltering', () => {
  let service: DataFilteringService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DataFilteringService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
