import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  inject,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SpeechToTextService } from '../services/speech-to-text.service';
import {
  SpeechRecordingState,
  SpeechError,
} from '../models/speech-to-text.model';

@Component({
  selector: 'app-speech-recorder',
  templateUrl: './speech-recorder.component.html',
  styleUrl: './speech-recorder.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class SpeechRecorderComponent {
  private destroyRef = inject(DestroyRef);
  private speechService = inject(SpeechToTextService);

  placeholder = input<string>('Click to start recording');
  disabled = input<boolean>(false);
  appendMode = input<boolean>(true);
  showLivePreview = input<boolean>(true);

  transcriptionChange = output<string>();
  recordingStateChange = output<SpeechRecordingState>();
  realtimeText = output<{ text: string; isFinal: boolean }>();
  segmentComplete = output<string>();
  error = output<SpeechError>();

  recordingState = signal<SpeechRecordingState>('idle');
  liveTranscription = signal<string>('');
  pendingText = signal<string>('');
  currentError = signal<SpeechError | null>(null);

  isIdle = computed(() => this.recordingState() === 'idle');
  isRecording = computed(() => this.recordingState() === 'recording');
  isPaused = computed(() => this.recordingState() === 'paused');
  isRequesting = computed(
    () => this.recordingState() === 'requesting_permission'
  );
  isStopping = computed(() => this.recordingState() === 'stopping');
  isError = computed(() => this.recordingState() === 'error');
  isActive = computed(
    () => this.isRecording() || this.isPaused() || this.isStopping()
  );

  buttonAriaLabel = computed(() => {
    const state = this.recordingState();
    switch (state) {
      case 'idle':
        return 'Start voice recording';
      case 'requesting_permission':
        return 'Requesting microphone permission';
      case 'recording':
        return 'Recording in progress. Click to pause';
      case 'paused':
        return 'Recording paused. Click to resume';
      case 'stopping':
        return 'Processing recording';
      case 'error':
        return (
          this.currentError()?.message || 'Recording error. Click to retry'
        );
      default:
        return 'Voice recording';
    }
  });

  buttonTooltip = computed(() => {
    const state = this.recordingState();
    switch (state) {
      case 'idle':
        return 'Click to start recording';
      case 'requesting_permission':
        return 'Requesting permission...';
      case 'recording':
        return 'Recording... Click to pause';
      case 'paused':
        return 'Paused. Click to resume';
      case 'stopping':
        return 'Processing...';
      case 'error':
        return this.currentError()?.message || 'Error. Click to retry';
      default:
        return '';
    }
  });

  constructor() {
    this.subscribeToService();
  }

  private subscribeToService(): void {
    // State changes
    this.speechService.state$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        this.recordingState.set(state);
        this.recordingStateChange.emit(state);
      });

    // Live transcription (for popover display)
    this.speechService.transcription$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((text) => {
        console.log('Live transcription update:', text);
        this.liveTranscription.set(text);
      });

    // Real-time text streaming (for direct textarea updates)
    this.speechService.realtimeText$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        console.log('Realtime text data received:', data);
        if (data.isFinal) {
          this.pendingText.set('');
        } else {
          this.pendingText.set(data.text);
        }
        this.realtimeText.emit(data);
      });

    // Segment complete (speaker pause/endpoint detected)
    this.speechService.segmentComplete$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((text) => {
        this.segmentComplete.emit(text);
      });

    // Final transcription text (when recording stops)
    this.speechService.finalText$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((text) => {
        if (text) {
          this.transcriptionChange.emit(text);
        }
      });

    // Errors
    this.speechService.error$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((err) => {
        this.currentError.set(err);
        if (err) {
          this.error.emit(err);
        }
      });
  }

  onButtonClick(): void {
    if (this.disabled()) {
      return;
    }

    const currentState = this.recordingState();

    switch (currentState) {
      case 'idle':
      case 'error':
        this.startRecording();
        break;
      case 'recording':
        this.pauseRecording();
        break;
      case 'paused':
        this.resumeRecording();
        break;
      case 'requesting_permission':
      case 'stopping':
        break;
    }
  }

  onStopClick(event: Event): void {
    event.stopPropagation();
    this.stopRecording();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onButtonClick();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelRecording();
    }
  }

  private startRecording(): void {
    this.speechService.clearTranscription();
    this.speechService.startRecording();
  }

  private pauseRecording(): void {
    this.speechService.pauseRecording();
  }

  private resumeRecording(): void {
    this.speechService.resumeRecording();
  }

  private stopRecording(): void {
    this.speechService.stopRecording();
  }

  private cancelRecording(): void {
    this.speechService.cancelRecording();
  }
}
