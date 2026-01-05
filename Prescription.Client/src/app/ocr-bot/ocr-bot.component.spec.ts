import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OcrBotComponent } from './ocr-bot.component';

describe('OcrBotComponent', () => {
  let component: OcrBotComponent;
  let fixture: ComponentFixture<OcrBotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OcrBotComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OcrBotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
