// src/app/services/metier/metier.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { MetierService } from './metier.service';

describe('MetierService', () => {
  let service: MetierService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MetierService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
