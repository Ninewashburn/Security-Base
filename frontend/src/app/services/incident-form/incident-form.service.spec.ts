import { TestBed } from '@angular/core/testing';

import { IncidentFormService } from './incident-form.service';

describe('IncidentFormService', () => {
  let service: IncidentFormService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IncidentFormService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
