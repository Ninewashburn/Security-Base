import { TestBed } from '@angular/core/testing';

import { IncidentExportService } from './incident-export.service';

describe('IncidentExportService', () => {
  let service: IncidentExportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IncidentExportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
