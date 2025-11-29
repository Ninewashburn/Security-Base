import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiffusionList } from './diffusion-list';

describe('DiffusionList', () => {
  let component: DiffusionList;
  let fixture: ComponentFixture<DiffusionList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiffusionList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DiffusionList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
