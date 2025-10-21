import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjetCreate } from './projet-create';

describe('ProjetCreate', () => {
  let component: ProjetCreate;
  let fixture: ComponentFixture<ProjetCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjetCreate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjetCreate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
