import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Validating } from './validating';

describe('Validating', () => {
  let component: Validating;
  let fixture: ComponentFixture<Validating>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Validating]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Validating);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
