import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Dons } from './dons';

describe('Dons', () => {
  let component: Dons;
  let fixture: ComponentFixture<Dons>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dons]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Dons);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
