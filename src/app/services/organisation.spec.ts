import { TestBed } from '@angular/core/testing';

import { Organisation } from './organisation';

describe('Organisation', () => {
  let service: Organisation;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Organisation);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
