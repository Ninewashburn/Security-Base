import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoleModal } from './role-modal';

describe('RoleModal', () => {
  let component: RoleModal;
  let fixture: ComponentFixture<RoleModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoleModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
