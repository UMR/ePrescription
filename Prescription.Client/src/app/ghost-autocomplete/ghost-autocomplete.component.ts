import { CommonModule } from '@angular/common';
import { Component, forwardRef, input, output, signal, OnDestroy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-ghost-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ghost-autocomplete.component.html',
  styleUrl: './ghost-autocomplete.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => GhostAutocompleteComponent),
      multi: true
    }
  ]
})
export class GhostAutocompleteComponent implements ControlValueAccessor, OnDestroy {
  placeholder = input<string>('Start typing...');
  suggestions = input<string[]>([]);
  debounceMs = input<number>(200);
  minChars = input<number>(1);
  caseSensitive = input<boolean>(false);
  inputClass = input<string>('');
  isTextarea = input<boolean>(false);
  enableNextSentence = input<boolean>(false);
  disableSuggestions = input<boolean>(false);
  isLoadingFromTemplate = input<boolean>(false);

  suggestionAccepted = output<string>();
  suggestionCount = output<number>();
  inputValue = signal<string>('');
  ghostSuggestion = signal<string>('');
  isDisabled = signal<boolean>(false);

  private inputSubject = new Subject<string>();
  private subscription?: Subscription;
  private onChange: (value: string) => void = () => { };
  private onTouched: () => void = () => { };

  constructor() {
    // No automatic suggestion trigger in constructor
    // Suggestions are only triggered by user input via onInputChange
  }

  ngOnInit() {
    this.subscription = this.inputSubject.pipe(
      debounceTime(this.debounceMs()),
      distinctUntilChanged()
    ).subscribe((query) => {
      this.updateGhostSuggestion(query);
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  writeValue(value: string): void {
    this.inputValue.set(value || '');
    // Don't trigger suggestions when value is set programmatically (e.g., from template)
    // Suggestions should only appear when user types
    this.ghostSuggestion.set('');
    this.suggestionCount.emit(0);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  onInputChange(value: string) {
    this.inputValue.set(value);
    this.onChange(value);

    // Always trigger suggestion update when user types
    // The updateGhostSuggestion method will handle the logic for when to show suggestions
    this.inputSubject.next(value);
  }

  onKeyDown(event: KeyboardEvent) {
    const ghost = this.ghostSuggestion();
    if (event.key === 'Tab' && ghost) {
      event.preventDefault();
      this.acceptSuggestion();
    } else if (event.key === 'Escape' && ghost) {
      event.preventDefault();
      this.ghostSuggestion.set('');
    } else if (event.key === 'ArrowRight' && ghost) {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement;
      const cursorAtEnd = target.selectionStart === this.inputValue().length;
      if (cursorAtEnd) {
        event.preventDefault();
        this.acceptSuggestion();
      }
    }
  }

  onBlur() {
    this.onTouched();
  }

  private updateGhostSuggestion(query: string) {
    // Don't show suggestions if disabled (e.g., for AI-generated content) or loading from template
    if (this.disableSuggestions() || this.isLoadingFromTemplate()) {
      this.ghostSuggestion.set('');
      this.suggestionCount.emit(0);
      return;
    }

    const suggestionList = this.suggestions();
    const minLength = this.minChars();
    const caseSensitiveMode = this.caseSensitive();

    if (query.length < minLength || !suggestionList.length) {
      this.ghostSuggestion.set('');
      this.suggestionCount.emit(0);
      return;
    }

    // Get text after the last punctuation to search for suggestions
    const textAfterPunctuation = this.getTextAfterLastPunctuation(query);
    const searchText = textAfterPunctuation.trim();

    // If text ends with punctuation (no text after it), don't suggest - wait for user to type
    if (!searchText) {
      this.ghostSuggestion.set('');
      this.suggestionCount.emit(0);
      return;
    }

    const searchQuery = caseSensitiveMode ? searchText : searchText.toLowerCase();
    const currentInputLower = query.toLowerCase();

    const matches = suggestionList.filter(suggestion => {
      const searchSuggestion = caseSensitiveMode ? suggestion : suggestion.toLowerCase();
      if (currentInputLower.includes(searchSuggestion)) {
        return false;
      }

      return searchSuggestion.startsWith(searchQuery);
    });

    this.suggestionCount.emit(matches.length);

    if (matches.length > 0) {
      const match = matches[0];
      if (match.toLowerCase() !== searchText.toLowerCase()) {
        this.ghostSuggestion.set(match.slice(searchText.length));
      } else {
        this.ghostSuggestion.set('');
      }
    } else {
      this.ghostSuggestion.set('');
    }
  }

  private getTextAfterLastPunctuation(text: string): string {
    const lastPunctuationIndex = Math.max(text.lastIndexOf(','), text.lastIndexOf('.'));
    if (lastPunctuationIndex === -1) {
      return text;
    }
    return text.substring(lastPunctuationIndex + 1);
  }

  private suggestNextSentence() {
    if (this.disableSuggestions()) {
      this.ghostSuggestion.set('');
      this.suggestionCount.emit(0);
      return;
    }

    const currentValue = this.inputValue();
    const suggestionList = this.suggestions();

    if (!suggestionList.length || !currentValue.trim()) {
      this.ghostSuggestion.set('');
      return;
    }

    const currentInputLower = currentValue.toLowerCase();
    const existingSentences = currentValue
      .split(/[,.]\s*/)
      .map(s => s.trim().toLowerCase())
      .filter(s => s.length > 0);
    const availableSuggestions = suggestionList.filter(suggestion => {
      const suggestionLower = suggestion.toLowerCase();
      return !currentInputLower.includes(suggestionLower) &&
        !existingSentences.some(existing =>
          existing === suggestionLower ||
          existing.includes(suggestionLower) ||
          suggestionLower.includes(existing)
        );
    });

    if (availableSuggestions.length > 0) {
      const needsSpace = !/\s$/.test(currentValue);
      const prefix = needsSpace ? ' ' : '';
      this.ghostSuggestion.set(prefix + availableSuggestions[0]);
      this.suggestionCount.emit(availableSuggestions.length);
    } else {
      this.ghostSuggestion.set('');
      this.suggestionCount.emit(0);
    }
  }

  private acceptSuggestion() {
    const currentValue = this.inputValue();
    const ghost = this.ghostSuggestion();
    const fullValue = currentValue + ghost;

    this.inputValue.set(fullValue);
    this.ghostSuggestion.set('');
    this.onChange(fullValue);
    this.suggestionAccepted.emit(fullValue);
  }
}
