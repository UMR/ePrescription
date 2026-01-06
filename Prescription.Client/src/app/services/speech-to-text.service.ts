import { Injectable, signal, computed, NgZone } from '@angular/core';
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
  RealtimeTextData,
  SegmentCompleteData,
} from '../models/speech-to-text.model';
import { SONIOX_AI_MODEL, SONIOX_MEDICAL_CONTEXT } from '../utils/soniox-constants';

@Injectable({
  providedIn: 'root',
})
export class SpeechToTextService {
  private sonioxClient: SonioxClient | null = null;

  private readonly _state = signal<SpeechRecordingState>('idle');
  private readonly _transcription = signal<string>('');
  private readonly _tokens = signal<SpeechToken[]>([]);
  private readonly _error = signal<SpeechError | null>(null);
  private readonly _finalText = signal<string>('');

  private readonly _realtimeText = signal<RealtimeTextData | null>(null);
  private readonly _segmentComplete = signal<SegmentCompleteData | null>(null);

  private accumulatedText = '';
  private pendingText = '';
  private isPausingIntentionally = false;

  readonly state = this._state.asReadonly();
  readonly transcription = this._transcription.asReadonly();
  readonly tokens = this._tokens.asReadonly();
  readonly error = this._error.asReadonly();
  readonly finalText = this._finalText.asReadonly();
  readonly realtimeText = this._realtimeText.asReadonly();
  readonly segmentComplete = this._segmentComplete.asReadonly();

  readonly isRecording = computed(() => this._state() === 'recording');
  readonly isPaused = computed(() => this._state() === 'paused');
  readonly isIdle = computed(() => this._state() === 'idle');
  readonly isError = computed(() => this._state() === 'error');
  readonly isStopping = computed(() => this._state() === 'stopping');
  readonly isRequesting = computed(() => this._state() === 'requesting_permission');
  readonly isActive = computed(() =>
    this.isRecording() || this.isPaused() || this.isStopping()
  );
  readonly hasError = computed(() => this._error() !== null);
  readonly hasTranscription = computed(() => this._transcription().length > 0);

  constructor(private ngZone: NgZone) {
    // Debug logging in development
    if (!environment.production) {
      this.setupDebugLogging();
    }
  }

  private setupDebugLogging(): void {
    // Using effect would require injection context, so we'll log on state changes manually
    console.log('[SONIOX]: Service initialized');
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
          console.log('[SONIOX]: Recording started');
        });
      },

      onFinished: () => {
        this.ngZone.run(() => {
          // Don't set to idle if we're intentionally pausing
          if (this.isPausingIntentionally) {
            this.isPausingIntentionally = false;
            this.setState('paused');
            console.log('[SONIOX]: Recording paused');
            return;
          }

          this.setState('idle');
          // Emit final accumulated text with conversation formatting
          if (this.accumulatedText.trim()) {
            const formattedText = this.formatFinalTranscription(this.accumulatedText);
            this._finalText.set(formattedText);
            console.log('[SONIOX]: Recording finished, final text:', formattedText);
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
          console.log(`[SONIOX]: State changed: ${oldState} -> ${newState}`);
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
    this._transcription.set('');
    this._realtimeText.set(null);
    this._segmentComplete.set(null);

    // Initialize client if needed
    if (!this.sonioxClient) {
      this.initializeClient(config);
    }

    const sonioxConfig = environment.soniox;

    try {
      this.sonioxClient?.start({
        model: config?.model || sonioxConfig.model || SONIOX_AI_MODEL,
        audioFormat: 'auto',
        languageHints: config?.languageHints || sonioxConfig.languageHints || ['en'],
        context: config?.context || SONIOX_MEDICAL_CONTEXT,
        enableSpeakerDiarization: config?.enableSpeakerDiarization || true,
        enableLanguageIdentification: config?.enableLanguageIdentification || false,
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
    if (!this.sonioxClient || this._state() === 'idle') {
      return;
    }

    const currentState = this._state();

    // If already paused, the client has already stopped - just finalize
    if (currentState === 'paused') {
      this.setState('idle');
      // Emit final accumulated text with conversation formatting
      if (this.accumulatedText.trim()) {
        const formattedText = this.formatFinalTranscription(this.accumulatedText);
        this._finalText.set(formattedText);
        console.log('[SONIOX]: Recording stopped from paused state, final text:', formattedText);
      }
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
    if (this._state() !== 'recording') {
      return;
    }

    // Soniox doesn't have built-in pause, so we stop and mark as paused
    // Set flag before stopping so onFinished knows to set 'paused' instead of 'idle'
    this.isPausingIntentionally = true;

    try {
      this.sonioxClient?.stop();
      // State will be set to 'paused' in onFinished callback
    } catch (error) {
      this.isPausingIntentionally = false;
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
    if (this._state() !== 'paused') {
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

    this._tokens.set(tokens);

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

    const timestamp = Date.now();

    // Emit real-time text updates for direct streaming to textarea
    if (finalText) {
      const cleanedFinal = this.cleanSegmentText(finalText);
      if (cleanedFinal) {
        // Emit finalized text
        this._realtimeText.set({ text: cleanedFinal, isFinal: true, timestamp });

        // Check if this is an endpoint (segment complete)
        if (this.isEndpointMarker(finalText)) {
          this._segmentComplete.set({ text: cleanedFinal, timestamp });
        }
      }
      this.accumulatedText += finalText;
    }

    // Emit pending text (will be replaced by final)
    if (pendingText) {
      const cleanedPending = this.cleanSegmentText(pendingText);
      if (cleanedPending) {
        this._realtimeText.set({ text: cleanedPending, isFinal: false, timestamp });
      }
    }

    // Show current transcription for popover (accumulated + pending)
    const currentTranscription = this.accumulatedText + pendingText;
    this._transcription.set(this.formatTranscription(currentTranscription));

    console.log('[SONIOX] Final text:', finalText);
    console.log('[SONIOX] Pending text:', pendingText);
  }

  /**
   * Clean token text by removing <end> markers and other artifacts
   */
  private cleanTokenText(text: string): string {
    if (!text) return '';
    // Keep <end> markers for now as they help with segmentation
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
   */
  private formatTranscription(text: string): string {
    if (!text) return '';

    // Split by <end> markers which indicate speaker pauses/endpoints
    const segments = text.split(/<end>/gi);

    // Process each segment
    const formattedSegments: string[] = [];

    for (let segment of segments) {
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

    return formattedSegments.join('\n\n');
  }

  /**
   * Format final transcription for clinical note output
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

    return formattedSegments.join('\n\n');
  }

  /**
   * Handle errors from Soniox client
   */
  private handleError(status: SpeechErrorStatus, message: string): void {
    console.error(`[SONIOX]: Speech error [${status}]:`, message);

    const userMessage = ERROR_MESSAGES[status] || message || 'An unexpected error occurred.';

    this._error.set({
      status,
      message: userMessage,
    });

    this.setState('error');

    // Reset to idle after a delay for transient errors
    if (status === 'websocket_error' || status === 'api_error') {
      setTimeout(() => {
        if (this._state() === 'error') {
          this.setState('idle');
        }
      }, 3000);
    }
  }

  /**
   * Update recording state
   */
  private setState(state: SpeechRecordingState): void {
    console.log('[SONIOX]: Recording state changed to', state);
    this._state.set(state);
  }

  /**
   * Clear any existing error
   */
  private clearError(): void {
    this._error.set(null);
  }

  /**
   * Clear accumulated transcription
   */
  clearTranscription(): void {
    this.accumulatedText = '';
    this.pendingText = '';
    this._transcription.set('');
    this._realtimeText.set(null);
    this._segmentComplete.set(null);
    this._finalText.set('');
  }

  /**
   * Get current transcription text (for imperative access)
   */
  getCurrentTranscription(): string {
    return this._transcription();
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
  }
}
