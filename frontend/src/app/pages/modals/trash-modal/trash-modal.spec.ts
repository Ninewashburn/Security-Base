import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrashModal } from './trash-modal';

describe('TrashModal', () => {
  let component: TrashModal;
  let fixture: ComponentFixture<TrashModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrashModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrashModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
