import { TestBed } from '@angular/core/testing';
import { DiffusionListService } from './diffusion-list.service';

describe('DiffusionListService', () => {
  let service: DiffusionListService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DiffusionListService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
