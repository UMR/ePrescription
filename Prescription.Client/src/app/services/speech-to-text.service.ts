import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { SonioxClient } from '@soniox/speech-to-text-web';
import { environment } from '../../environments/environment';
import {
  SpeechRecordingState,
  SpeechToken,
  SpeechError,
  SpeechErrorStatus,
  SpeechToTextConfig,
  ERROR_MESSAGES,
  SpeechTranscriptionResult,
} from '../models/speech-to-text.model';
import { SONIOX_AI_MODEL, SONIOX_MEDICAL_CONTEXT } from '../utils/soniox-constants';


@Injectable({
  providedIn: 'root',
})
export class SpeechToTextService {
  private sonioxClient: SonioxClient | null = null;

  private stateSubject = new BehaviorSubject<SpeechRecordingState>('idle');
  private transcriptionSubject = new BehaviorSubject<string>('');
  private tokensSubject = new Subject<SpeechToken[]>();
  private errorSubject = new BehaviorSubject<SpeechError | null>(null);
  private finalTextSubject = new Subject<string>();

  private realtimeTextSubject = new Subject<{
    text: string;
    isFinal: boolean;
  }>();
  private segmentCompleteSubject = new Subject<string>();

  private accumulatedText = '';
  private pendingText = '';

  readonly state$ = this.stateSubject.asObservable();
  readonly transcription$ = this.transcriptionSubject.asObservable();
  readonly tokens$ = this.tokensSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();
  readonly finalText$ = this.finalTextSubject.asObservable();

  readonly realtimeText$ = this.realtimeTextSubject.asObservable();
  readonly segmentComplete$ = this.segmentCompleteSubject.asObservable();

  constructor(private ngZone: NgZone) {
    this.stateSubject.subscribe((state) => {
      console.log('[SONIOX]: Recording state changed to', state);
    });

    this.transcription$.subscribe((value) => {
      console.log('[SONIOX]: Transcription updated to', value);
    });

    this.tokens$.subscribe((value) => {
      console.log('[SONIOX]: Tokens updated to', value);
    });

    this.error$.subscribe((error) => {
      if (error) {
        console.log('[SONIOX]: Error occurred', error);
      }
    });

    this.finalText$.subscribe((text) => {
      console.log('[SONIOX]: Final transcription text received:', text);
    });
  }

  /**
   * Initialize the Soniox client with configuration
   */
  private initializeClient(config?: Partial<SpeechToTextConfig>): void {
    const sonioxConfig = environment.soniox;

    this.sonioxClient = new SonioxClient({
      apiKey: config?.apiKey || sonioxConfig.apiKey,
      bufferQueueSize: 1000,
      onStarted: () => {
        this.ngZone.run(() => {
          this.setState('recording');
          this.clearError();
        });
      },

      onFinished: () => {
        this.ngZone.run(() => {
          this.setState('idle');
          // Emit final accumulated text with conversation formatting
          if (this.accumulatedText.trim()) {
            const formattedText = this.formatFinalTranscription(
              this.accumulatedText
            );
            this.finalTextSubject.next(formattedText);
          }
        });
      },

      onPartialResult: (result) => {
        this.ngZone.run(() => {
          console.log('[SONIOX]: Partial result callback:', result);
          this.handlePartialResult(result);
        });
      },

      onStateChange: ({ newState, oldState }) => {
        this.ngZone.run(() => {
          this.handleStateChange(newState, oldState);
        });
      },

      onError: (status, message) => {
        this.ngZone.run(() => {
          this.handleError(status as SpeechErrorStatus, message);
        });
      },
    });
  }

  /**
   * Start speech recognition
   */
  startRecording(config?: Partial<SpeechToTextConfig>): void {
    if (this.isRecording()) {
      return;
    }

    this.setState('requesting_permission');
    this.clearError();
    this.accumulatedText = '';
    this.pendingText = '';
    this.transcriptionSubject.next('');

    // Initialize client if needed
    if (!this.sonioxClient) {
      this.initializeClient(config);
    }

    const sonioxConfig = environment.soniox;

    try {
      this.sonioxClient?.start({
        model: config?.model || sonioxConfig.model || SONIOX_AI_MODEL,
        audioFormat: 'auto',
        languageHints: config?.languageHints ||
          sonioxConfig.languageHints || ['en'],
        context: config?.context || SONIOX_MEDICAL_CONTEXT,
        enableSpeakerDiarization: config?.enableSpeakerDiarization || true,
        enableLanguageIdentification:
          config?.enableLanguageIdentification || false,
        enableEndpointDetection: config?.enableEndpointDetection ?? true,
      });
    } catch (error) {
      this.handleError(
        'unknown_error',
        error instanceof Error ? error.message : 'Failed to start recording'
      );
    }
  }

  /**
   * Stop recording gracefully (waits for final results)
   */
  stopRecording(): void {
    if (!this.sonioxClient || this.stateSubject.value === 'idle') {
      return;
    }

    this.setState('stopping');

    try {
      this.sonioxClient.stop();
    } catch (error) {
      this.handleError(
        'unknown_error',
        error instanceof Error ? error.message : 'Failed to stop recording'
      );
      this.setState('idle');
    }
  }

  /**
   * Cancel recording immediately (discards pending audio)
   */
  cancelRecording(): void {
    if (!this.sonioxClient) {
      return;
    }

    try {
      this.sonioxClient.cancel();
    } catch (error) {
      console.error('[SONIOX]: Error cancelling recording:', error);
    }

    this.setState('idle');
  }

  /**
   * Pause the current recording session
   */
  pauseRecording(): void {
    if (this.stateSubject.value !== 'recording') {
      return;
    }

    // Soniox doesn't have built-in pause, so we stop and mark as paused
    // The accumulated text is preserved
    try {
      this.sonioxClient?.stop();
      this.setState('paused');
    } catch (error) {
      this.handleError(
        'unknown_error',
        error instanceof Error ? error.message : 'Failed to pause recording'
      );
    }
  }

  /**
   * Resume a paused recording session
   */
  resumeRecording(): void {
    if (this.stateSubject.value !== 'paused') {
      return;
    }

    // Re-initialize and start, preserving accumulated text
    this.initializeClient();
    this.startRecording();
  }

  /**
   * Force finalization of current transcription
   */
  finalize(): void {
    if (this.sonioxClient && this.isRecording()) {
      try {
        this.sonioxClient.finalize();
      } catch (error) {
        console.error('[SONIOX]: Error finalizing:', error);
      }
    }
  }

  /**
   * Handle partial transcription results from Soniox
   */
  private handlePartialResult(result: SpeechTranscriptionResult): void {
    console.log('[SONIOX] Partial result received:', result);
    if (!result.tokens || result.tokens.length === 0) {
      return;
    }

    // Convert Soniox tokens to our format
    const tokens: SpeechToken[] = result.tokens.map((t) => ({
      text: this.cleanTokenText(t.text),
      startMs: t.start_ms || 0,
      endMs: t.end_ms || 0,
      confidence: t.confidence || 1,
      is_final: t.is_final || false,
      speaker: t.speaker,
      language: t.language,
    }));

    this.tokensSubject.next(tokens);

    // Build transcription text
    let finalText = '';
    let pendingText = '';

    for (const token of tokens) {
      if (token.is_final) {
        finalText += token.text;
      } else {
        pendingText += token.text;
      }
    }

    // Emit real-time text updates for direct streaming to textarea
    if (finalText) {
      const cleanedFinal = this.cleanSegmentText(finalText);
      if (cleanedFinal) {
        // Emit finalized text
        this.realtimeTextSubject.next({ text: cleanedFinal, isFinal: true });

        // Check if this is an endpoint (segment complete)
        if (this.isEndpointMarker(finalText)) {
          this.segmentCompleteSubject.next(cleanedFinal);
        }
      }
      this.accumulatedText += finalText;
    }

    // Emit pending text (will be replaced by final)
    if (pendingText) {
      const cleanedPending = this.cleanSegmentText(pendingText);
      if (cleanedPending) {
        this.realtimeTextSubject.next({ text: cleanedPending, isFinal: false });
      }
    }

    // Show current transcription for popover (accumulated + pending)
    const currentTranscription = this.accumulatedText + pendingText;
    this.transcriptionSubject.next(
      this.formatTranscription(currentTranscription)
    );

    console.log('[SONIOX] Raw tokens:', result.tokens);
    console.log('[SONIOX] Final text:', finalText);
    console.log('[SONIOX] Pending text:', pendingText);
  }

  /**
   * Clean token text by removing <end> markers and other artifacts
   */
  private cleanTokenText(text: string): string {
    if (!text) return '';
    // Keep <end> markers for now as they help with segmentation
    // They will be cleaned in display formatting
    return text;
  }

  /**
   * Clean segment text for display (removes <end> markers)
   */
  private cleanSegmentText(text: string): string {
    if (!text) return '';

    // Remove <end> markers
    let cleaned = text.replace(/<end>/gi, '');

    // Clean up extra spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
  }

  /**
   * Check if the text contains an endpoint marker
   */
  private isEndpointMarker(text: string): boolean {
    return /<end>/i.test(text);
  }

  /**
   * Format transcription for display as a conversation
   * Handles <end> markers as conversational pauses/speaker changes
   */
  private formatTranscription(text: string): string {
    if (!text) return '';

    // Split by <end> markers which indicate speaker pauses/endpoints
    const segments = text.split(/<end>/gi);

    // Process each segment
    const formattedSegments: string[] = [];

    for (let segment of segments) {
      // Clean up the segment
      segment = segment.trim();

      if (!segment || segment === '.' || segment === ',') {
        continue;
      }

      // Remove leading/trailing punctuation that's orphaned
      segment = segment.replace(/^[.,;:]+\s*/, '').replace(/\s*[.,;:]+$/, '');

      if (!segment) continue;

      // Clean up extra spaces
      segment = segment.replace(/\s+/g, ' ').trim();

      // Capitalize first letter
      if (segment.length > 0) {
        segment = segment.charAt(0).toUpperCase() + segment.slice(1);
      }

      // Add proper ending punctuation if missing
      if (segment && !/[.!?]$/.test(segment)) {
        segment += '.';
      }

      if (segment && segment !== '.') {
        formattedSegments.push(segment);
      }
    }

    // Join segments with line breaks for conversation format
    // Each segment represents a different speaker turn or pause
    return formattedSegments.join('\n\n');
  }

  /**
   * Format final transcription for clinical note output
   * Creates a more structured conversation format with em-dash bullets
   */
  private formatFinalTranscription(text: string): string {
    if (!text) return '';

    // Split by <end> markers
    const segments = text.split(/<end>/gi);

    const formattedSegments: string[] = [];

    for (let segment of segments) {
      segment = segment.trim();

      if (!segment || segment === '.' || segment === ',') {
        continue;
      }

      // Remove orphaned punctuation
      segment = segment.replace(/^[.,;:]+\s*/, '').replace(/\s*[.,;:]+$/, '');

      if (!segment) continue;

      // Clean up spaces
      segment = segment.replace(/\s+/g, ' ').trim();

      // Capitalize first letter
      if (segment.length > 0) {
        segment = segment.charAt(0).toUpperCase() + segment.slice(1);
      }

      // Add ending punctuation if missing
      if (segment && !/[.!?]$/.test(segment)) {
        segment += '.';
      }

      if (segment && segment !== '.') {
        formattedSegments.push(`— ${segment}`);
      }
    }

    // Join with double line breaks for clear separation
    return formattedSegments.join('\n\n');
  }

  /**
   * Handle state changes from Soniox client
   */
  private handleStateChange(newState: string, oldState: string): void {
    console.log(`[SONIOX]: Speech state changed: ${oldState} -> ${newState}`);
  }

  /**
   * Handle errors from Soniox client
   */
  private handleError(status: SpeechErrorStatus, message: string): void {
    console.error(`[SONIOX]: Speech error [${status}]:`, message);

    const userMessage =
      ERROR_MESSAGES[status] || message || 'An unexpected error occurred.';

    this.errorSubject.next({
      status,
      message: userMessage,
    });

    this.setState('error');

    // Reset to idle after a delay for transient errors
    if (status === 'websocket_error' || status === 'api_error') {
      setTimeout(() => {
        if (this.stateSubject.value === 'error') {
          this.setState('idle');
        }
      }, 3000);
    }
  }

  /**
   * Update recording state
   */
  private setState(state: SpeechRecordingState): void {
    this.stateSubject.next(state);
  }

  /**
   * Clear any existing error
   */
  private clearError(): void {
    this.errorSubject.next(null);
  }

  /**
   * Clear accumulated transcription
   */
  clearTranscription(): void {
    this.accumulatedText = '';
    this.pendingText = '';
    this.transcriptionSubject.next('');
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.stateSubject.value === 'recording';
  }

  /**
   * Check if currently paused
   */
  isPaused(): boolean {
    return this.stateSubject.value === 'paused';
  }

  /**
   * Get current state
   */
  getState(): SpeechRecordingState {
    return this.stateSubject.value;
  }

  /**
   * Get current transcription text
   */
  getCurrentTranscription(): string {
    return this.transcriptionSubject.value;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.sonioxClient) {
      try {
        this.sonioxClient.cancel();
      } catch {
        // Ignore cleanup errors
      }
      this.sonioxClient = null;
    }

    this.stateSubject.complete();
    this.transcriptionSubject.complete();
    this.tokensSubject.complete();
    this.errorSubject.complete();
    this.finalTextSubject.complete();
    this.realtimeTextSubject.complete();
    this.segmentCompleteSubject.complete();
  }
}
