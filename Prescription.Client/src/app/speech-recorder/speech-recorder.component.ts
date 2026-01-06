import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  inject,
  effect,
  linkedSignal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpeechToTextService } from '../services/speech-to-text.service';
import {
  SpeechRecordingState,
  SpeechError,
  RealtimeTextData,
  SegmentCompleteData,
} from '../models/speech-to-text.model';

@Component({
  selector: 'app-speech-recorder',
  templateUrl: './speech-recorder.component.html',
  styleUrl: './speech-recorder.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class SpeechRecorderComponent {
  private speechService = inject(SpeechToTextService);

  placeholder = input<string>('Click to start recording');
  disabled = input<boolean>(false);
  appendMode = input<boolean>(true);
  showLivePreview = input<boolean>(true);

  transcriptionChange = output<string>();
  recordingStateChange = output<SpeechRecordingState>();
  realtimeText = output<RealtimeTextData>();
  segmentComplete = output<SegmentCompleteData>();
  error = output<SpeechError>();

  recordingState = linkedSignal(() => this.speechService.state());
  liveTranscription = linkedSignal(() => this.speechService.transcription());
  currentError = linkedSignal(() => this.speechService.error());

  pendingText = signal<string>('');

  isIdle = computed(() => this.speechService.isIdle());
  isRecording = computed(() => this.speechService.isRecording());
  isPaused = computed(() => this.speechService.isPaused());
  isRequesting = computed(() => this.speechService.isRequesting());
  isStopping = computed(() => this.speechService.isStopping());
  isError = computed(() => this.speechService.isError());
  isActive = computed(() => this.speechService.isActive());

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

  private previousRealtimeTimestamp = 0;
  private previousSegmentTimestamp = 0;
  private previousFinalText = '';

  constructor() {
    // Effect: Emit state changes to parent
    effect(() => {
      const state = this.speechService.state();
      this.recordingStateChange.emit(state);
    });

    // Effect: Handle real-time text updates
    effect(() => {
      const realtimeData = this.speechService.realtimeText();
      if (
        realtimeData &&
        realtimeData.timestamp !== this.previousRealtimeTimestamp
      ) {
        this.previousRealtimeTimestamp = realtimeData.timestamp;
        console.log('Realtime text data received:', realtimeData);

        if (realtimeData.isFinal) {
          this.pendingText.set('');
        } else {
          this.pendingText.set(realtimeData.text);
        }

        this.realtimeText.emit(realtimeData);
      }
    });

    // Effect: Handle segment completion
    effect(() => {
      const segmentData = this.speechService.segmentComplete();
      if (
        segmentData &&
        segmentData.timestamp !== this.previousSegmentTimestamp
      ) {
        this.previousSegmentTimestamp = segmentData.timestamp;
        this.segmentComplete.emit(segmentData);
      }
    });

    // Effect: Handle final text (when recording stops)
    effect(() => {
      const finalText = this.speechService.finalText();
      if (finalText && finalText !== this.previousFinalText) {
        this.previousFinalText = finalText;
        this.transcriptionChange.emit(finalText);
      }
    });

    // Effect: Handle errors
    effect(() => {
      const err = this.speechService.error();
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
    this.previousRealtimeTimestamp = 0;
    this.previousSegmentTimestamp = 0;
    this.previousFinalText = '';
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
