import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { IncidentDataService } from '../../services/incident-data/incident-data.service';
import { IncidentUpdate } from './incident-update';

describe('IncidentUpdate', () => {
  let component: IncidentUpdate;
  let fixture: ComponentFixture<IncidentUpdate>;
  let mockIncidentDataService: jasmine.SpyObj<IncidentDataService>;

  beforeEach(async () => {
    mockIncidentDataService = jasmine.createSpyObj('IncidentDataService', ['getIncidentById']);
    mockIncidentDataService.getIncidentById.and.returnValue({ id: 1, object: 'Test Incident', description: 'Test Description', dateOuverture: new Date(), domains: [], publicsImpactes: [], sitesImpactes: [], gravity: 'faible', status: 'en_cours', redacteur_id: 1, isNational: false, actionsMenees: '', actionsAMener: '' });

    await TestBed.configureTestingModule({
      imports: [IncidentUpdate],
      providers: [
        { 
          provide: ActivatedRoute, 
          useValue: { 
            paramMap: of(convertToParamMap({ id: '1' }))
          } 
        },
        { provide: IncidentDataService, useValue: mockIncidentDataService }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IncidentUpdate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
