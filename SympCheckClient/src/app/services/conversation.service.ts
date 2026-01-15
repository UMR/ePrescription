import { Injectable } from '@angular/core';
import { FollowUpAnswer } from '../models/api.models';

/**
 * Manages conversation questions/answers and prevents repeats
 */
@Injectable({
  providedIn: 'root',
})
export class ConversationService {
  private askedQuestions: string[] = [];
  private skippedQuestions: string[] = [];
  private answers: Array<{ question: string; answer: string }> = [];

  constructor() {}

  /**
   * Reset conversation state
   */
  reset(): void {
    this.askedQuestions = [];
    this.skippedQuestions = [];
    this.answers = [];
  }

  /**
   * Record that a question was asked
   */
  recordAskedQuestion(question: string): void {
    if (!this.askedQuestions.includes(question)) {
      this.askedQuestions.push(question);
    }
  }

  /**
   * Record a skipped question
   */
  recordSkippedQuestion(question: string): void {
    if (!this.skippedQuestions.includes(question)) {
      this.skippedQuestions.push(question);
    }
  }

  /**
   * Record an answer
   */
  recordAnswer(question: string, answer: string): void {
    this.answers.push({ question, answer });
  }

  /**
   * Check if a question has already been asked or skipped
   */
  hasBeenAsked(question: string): boolean {
    return this.askedQuestions.includes(question) || this.skippedQuestions.includes(question);
  }

  /**
   * Get all asked questions
   */
  getAskedQuestions(): string[] {
    return [...this.askedQuestions];
  }

  /**
   * Get all skipped questions
   */
  getSkippedQuestions(): string[] {
    return [...this.skippedQuestions];
  }

  /**
   * Get all answers as FollowUpAnswer
   */
  getAnswers(): FollowUpAnswer[] {
    return this.answers.map((a) => ({
      Question: a.question,
      Answer: a.answer,
    }));
  }

  /**
   * Get conversation summary as array of answers
   */
  getFormattedAnswers(): Array<{ question: string; answer: string }> {
    return [...this.answers];
  }

  /**
   * Get total interaction count (answers + skipped)
   */
  getTotalInteractions(): number {
    return this.answers.length + this.skippedQuestions.length;
  }
}
