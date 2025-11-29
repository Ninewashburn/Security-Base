import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncidentTemplate } from './incident-template';

describe('IncidentTemplate', () => {
  let component: IncidentTemplate;
  let fixture: ComponentFixture<IncidentTemplate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncidentTemplate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IncidentTemplate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
