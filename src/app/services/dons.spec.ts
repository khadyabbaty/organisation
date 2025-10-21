import { TestBed } from '@angular/core/testing';

import { Dons } from './dons';

describe('Dons', () => {
  let service: Dons;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Dons);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
