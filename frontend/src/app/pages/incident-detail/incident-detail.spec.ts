import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { IncidentDetail } from './incident-detail';

describe('IncidentDetail', () => {
  let component: IncidentDetail;
  let fixture: ComponentFixture<IncidentDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncidentDetail],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '1' } }, params: of({ id: '1' }) }
        }
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(IncidentDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
