import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MetierRole } from './metier-role';

describe('MetierRole', () => {
  let component: MetierRole;
  let fixture: ComponentFixture<MetierRole>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetierRole]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MetierRole);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
