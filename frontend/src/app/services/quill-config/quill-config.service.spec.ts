import { TestBed } from '@angular/core/testing';

import { QuillConfigService } from './quill-config.service';

describe('QuillConfigService', () => {
  let service: QuillConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(QuillConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
