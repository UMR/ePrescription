import { Component, EventEmitter, Input, Output, signal, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MeetingNotesResponse } from '../../services/clinical-chat.service';

export type PopupState = 'hidden' | 'thinking' | 'streaming' | 'complete' | 'error';

@Component({
  selector: 'app-meeting-summary-popup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './meeting-summary-popup.component.html',
  styleUrl: './meeting-summary-popup.component.css'
})
export class MeetingSummaryPopupComponent implements OnChanges, OnDestroy {
  @Input() isOpen = false;
  @Input() response: MeetingNotesResponse | null = null;
  @Input() error: string | null = null;
  @Output() close = new EventEmitter<void>();

  state = signal<PopupState>('hidden');
  displayedSummary = signal<string>('');
  displayedKeyPoints = signal<string[]>([]);
  displayedDecisions = signal<string[]>([]);

  private streamingInterval: ReturnType<typeof setInterval> | null = null;
  private currentCharIndex = 0;
  private thinkingTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']) {
      if (this.isOpen) {
        this.state.set('thinking');
        this.resetDisplay();
      } else {
        this.state.set('hidden');
        this.cleanup();
      }
    }

    if (changes['response'] && this.response && this.isOpen) {
      // Start streaming after a short "thinking" delay
      this.thinkingTimeout = setTimeout(() => {
        this.startStreaming();
      }, 1500);
    }

    if (changes['error'] && this.error && this.isOpen) {
      this.state.set('error');
    }
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private cleanup(): void {
    if (this.streamingInterval) {
      clearInterval(this.streamingInterval);
      this.streamingInterval = null;
    }
    if (this.thinkingTimeout) {
      clearTimeout(this.thinkingTimeout);
      this.thinkingTimeout = null;
    }
  }

  private resetDisplay(): void {
    this.displayedSummary.set('');
    this.displayedKeyPoints.set([]);
    this.displayedDecisions.set([]);
    this.currentCharIndex = 0;
    this.cleanup();
  }

  private startStreaming(): void {
    if (!this.response) return;

    this.state.set('streaming');
    const fullSummary = this.response.summary;
    const streamSpeed = 20; // milliseconds per character

    this.streamingInterval = setInterval(() => {
      if (this.currentCharIndex < fullSummary.length) {
        this.currentCharIndex++;
        this.displayedSummary.set(fullSummary.substring(0, this.currentCharIndex));
      } else {
        // Summary complete, show key points and decisions
        this.cleanup();
        this.displayedKeyPoints.set(this.response?.keyPoints || []);
        this.displayedDecisions.set(this.response?.decisions || []);
        this.state.set('complete');
      }
    }, streamSpeed);
  }

  onClose(): void {
    this.cleanup();
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('popup-backdrop')) {
      this.onClose();
    }
  }
}
