import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncidentCreate} from './incident-create'

describe('IncidentCreate', () => {
  let component: IncidentCreate;
  let fixture: ComponentFixture<IncidentCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncidentCreate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IncidentCreate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
