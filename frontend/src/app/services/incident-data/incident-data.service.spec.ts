import { TestBed } from '@angular/core/testing';

import {IncidentDataService} from '../../services/incident-data/incident-data.service';

describe('IncidentData', () => {
  let service: IncidentDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IncidentDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
