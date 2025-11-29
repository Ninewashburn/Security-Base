import { TestBed } from '@angular/core/testing';

import { IncidentDisplayService } from '../incident-display/incident-display.service';

describe('IncidentDisplay', () => {
  let service: IncidentDisplayService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IncidentDisplayService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
