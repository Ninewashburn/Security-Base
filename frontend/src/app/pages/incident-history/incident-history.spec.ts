import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncidentHistory } from './incident-history';

describe('IncidentHistory', () => {
  let component: IncidentHistory;
  let fixture: ComponentFixture<IncidentHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncidentHistory]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IncidentHistory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
