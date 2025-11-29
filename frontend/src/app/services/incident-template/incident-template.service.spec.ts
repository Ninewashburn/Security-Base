import { TestBed } from '@angular/core/testing';

import { IncidentTemplateService } from './incident-template.service';

describe('IncidentTemplateService', () => {
  let service: IncidentTemplateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IncidentTemplateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
