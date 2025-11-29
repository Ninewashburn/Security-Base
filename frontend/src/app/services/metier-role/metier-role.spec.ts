import { TestBed } from '@angular/core/testing';

import { MetierRoleService } from './metier-role.service';

describe('MetierRoleService', () => {
  let service: MetierRoleService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MetierRoleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
