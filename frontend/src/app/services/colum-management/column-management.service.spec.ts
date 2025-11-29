import { TestBed } from '@angular/core/testing';

import { ColumnManagementService } from './column-management.service';

describe('ColumnManagement', () => {
  let service: ColumnManagementService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ColumnManagementService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
