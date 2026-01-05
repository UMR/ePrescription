import { Component, ElementRef, ViewChild, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OcrService, OcrResult, TextRegion, OcrQuestionResponse, ExtractedMedication, ParsedPatientInfo, ParsedDoctorInfo, ParsedLabResult } from '../services/ocr.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface ChatMessage {
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  confidence?: string;
  relevantSections?: string[];
}

@Component({
  selector: 'app-ocr-bot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ocr-bot.component.html',
  styleUrl: './ocr-bot.component.css',
})
export class OcrBotComponent implements OnInit, AfterViewInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('documentCanvas') documentCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chatContainer') chatContainer!: ElementRef<HTMLDivElement>;

  // State
  isProcessing = false;
  isDragOver = false;
  hasResult = false;
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  errorMessage: string | null = null;

  // OCR Result
  ocrResult: OcrResult | null = null;

  // UI State
  activeTab: 'preview' | 'sections' | 'summary' | 'chat' = 'preview';
  showAllRegions = true;
  selectedCategory: string | null = null;
  highlightedRegion: TextRegion | null = null;

  // Chat
  chatMessages: ChatMessage[] = [];
  currentQuestion = '';
  isAskingQuestion = false;

  // Image dimensions for canvas
  imageWidth = 0;
  imageHeight = 0;
  loadedImage: HTMLImageElement | null = null;

  constructor(private ocrService: OcrService, private sanitizer: DomSanitizer) { }

  ngOnInit(): void { }

  ngAfterViewInit(): void { }

  // File handling
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  handleFile(file: File): void {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
    if (!allowedTypes.includes(file.type)) {
      this.errorMessage = 'Invalid file type. Please upload an image (JPEG, PNG, GIF, WebP, or BMP).';
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      this.errorMessage = 'File size exceeds 10MB limit.';
      return;
    }

    this.selectedFile = file;
    this.errorMessage = null;

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewUrl = e.target?.result as string;
      this.loadImageForCanvas();
    };
    reader.readAsDataURL(file);
  }

  loadImageForCanvas(): void {
    if (!this.previewUrl) return;

    const img = new Image();
    img.onload = () => {
      this.loadedImage = img;
      this.imageWidth = img.width;
      this.imageHeight = img.height;
      this.drawCanvas();
    };
    img.src = this.previewUrl;
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  processImage(): void {
    if (!this.selectedFile) return;

    this.isProcessing = true;
    this.errorMessage = null;

    this.ocrService.processImage(this.selectedFile).subscribe({
      next: (result) => {
        this.ocrResult = result;
        this.hasResult = true;
        this.isProcessing = false;
        this.activeTab = 'sections';

        // Add initial chat message
        this.chatMessages = [{
          type: 'assistant',
          content: `I've analyzed your medical document. I found ${result.textRegions?.length || 0} text regions and extracted information including ${this.getSectionsSummary()}. Feel free to ask me any questions about this document!`,
          timestamp: new Date()
        }];

        // Redraw canvas with regions
        setTimeout(() => this.drawCanvas(), 100);
      },
      error: (error) => {
        console.error('OCR Error:', error);
        this.errorMessage = error.error?.error || 'Failed to process image. Please try again.';
        this.isProcessing = false;
      }
    });
  }

  getSectionsSummary(): string {
    if (!this.ocrResult?.sections) return 'various sections';

    const sections: string[] = [];
    const s = this.ocrResult.sections;

    if (s.patientInformation) sections.push('patient information');
    if (s.doctorInformation) sections.push('doctor information');
    if (s.diagnosis) sections.push('diagnosis');
    if (s.medications?.length) sections.push(`${s.medications.length} medication(s)`);
    if (s.labResults) sections.push('lab results');
    if (s.vitalSigns) sections.push('vital signs');
    if (s.clinicalNotes) sections.push('clinical notes');
    if (s.instructions) sections.push('instructions');
    if (s.followUp) sections.push('follow-up');

    return sections.length > 0 ? sections.join(', ') : 'various sections';
  }

  // Canvas drawing
  drawCanvas(): void {
    if (!this.documentCanvas || !this.loadedImage) return;

    const canvas = this.documentCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match container while maintaining aspect ratio
    const container = canvas.parentElement;
    if (!container) return;

    const containerWidth = container.clientWidth - 20;
    const scale = containerWidth / this.imageWidth;
    const scaledHeight = this.imageHeight * scale;

    canvas.width = containerWidth;
    canvas.height = scaledHeight;

    // Draw image
    ctx.drawImage(this.loadedImage, 0, 0, containerWidth, scaledHeight);

    // Draw text regions if we have results
    if (this.ocrResult?.textRegions && this.showAllRegions) {
      this.ocrResult.textRegions.forEach(region => {
        if (this.selectedCategory && region.category !== this.selectedCategory) return;
        this.drawRegion(ctx, region, scale, region === this.highlightedRegion);
      });
    }

    // Draw highlighted region on top
    if (this.highlightedRegion) {
      this.drawRegion(ctx, this.highlightedRegion, scale, true);
    }
  }

  drawRegion(ctx: CanvasRenderingContext2D, region: TextRegion, scale: number, isHighlighted: boolean): void {
    const color = this.ocrService.getCategoryColor(region.category);
    const alpha = isHighlighted ? 0.4 : 0.2;

    // Convert percentage coordinates to actual pixels
    const x = (region.boundingBox.x / 100) * this.imageWidth * scale;
    const y = (region.boundingBox.y / 100) * this.imageHeight * scale;
    const width = (region.boundingBox.width / 100) * this.imageWidth * scale;
    const height = (region.boundingBox.height / 100) * this.imageHeight * scale;

    // Draw filled rectangle
    ctx.fillStyle = this.hexToRgba(color, alpha);
    ctx.fillRect(x, y, width, height);

    // Draw border
    ctx.strokeStyle = color;
    ctx.lineWidth = isHighlighted ? 3 : 2;
    ctx.strokeRect(x, y, width, height);

    // Draw polygon if available
    if (region.boundingBox.polygon && region.boundingBox.polygon.length > 2) {
      ctx.beginPath();
      const firstPoint = region.boundingBox.polygon[0];
      ctx.moveTo(
        (firstPoint.x / 100) * this.imageWidth * scale,
        (firstPoint.y / 100) * this.imageHeight * scale
      );

      region.boundingBox.polygon.slice(1).forEach(point => {
        ctx.lineTo(
          (point.x / 100) * this.imageWidth * scale,
          (point.y / 100) * this.imageHeight * scale
        );
      });

      ctx.closePath();
      ctx.fillStyle = this.hexToRgba(color, alpha);
      ctx.fill();
      ctx.stroke();
    }

    // Draw label for highlighted region
    if (isHighlighted) {
      ctx.fillStyle = color;
      ctx.font = 'bold 12px Arial';
      const label = this.ocrService.getCategoryDisplayName(region.category);
      const textWidth = ctx.measureText(label).width;

      // Background for label
      ctx.fillStyle = color;
      ctx.fillRect(x, y - 20, textWidth + 8, 18);

      // Label text
      ctx.fillStyle = '#fff';
      ctx.fillText(label, x + 4, y - 6);
    }
  }

  hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Region interactions
  highlightRegion(region: TextRegion): void {
    this.highlightedRegion = region;
    this.drawCanvas();
  }

  clearHighlight(): void {
    this.highlightedRegion = null;
    this.drawCanvas();
  }

  filterByCategory(category: string | null): void {
    this.selectedCategory = category;
    this.drawCanvas();
  }

  toggleShowAllRegions(): void {
    this.showAllRegions = !this.showAllRegions;
    this.drawCanvas();
  }

  // Chat functionality
  askQuestion(): void {
    if (!this.currentQuestion.trim() || !this.ocrResult?.extractedText) return;

    const question = this.currentQuestion.trim();
    this.currentQuestion = '';

    // Add user message
    this.chatMessages.push({
      type: 'user',
      content: question,
      timestamp: new Date()
    });

    this.isAskingQuestion = true;
    this.scrollChatToBottom();

    this.ocrService.askQuestion(this.ocrResult.extractedText, question, this.ocrResult.sections).subscribe({
      next: (response) => {
        this.chatMessages.push({
          type: 'assistant',
          content: response.answer,
          timestamp: new Date(),
          confidence: response.confidence,
          relevantSections: response.relevantSections
        });
        this.isAskingQuestion = false;
        this.scrollChatToBottom();
      },
      error: (error) => {
        this.chatMessages.push({
          type: 'assistant',
          content: 'Sorry, I encountered an error processing your question. Please try again.',
          timestamp: new Date()
        });
        this.isAskingQuestion = false;
        this.scrollChatToBottom();
      }
    });
  }

  scrollChatToBottom(): void {
    setTimeout(() => {
      if (this.chatContainer) {
        const container = this.chatContainer.nativeElement;
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }

  // Utility methods
  getCategoryColor(category: string): string {
    return this.ocrService.getCategoryColor(category);
  }

  getCategoryDisplayName(category: string): string {
    return this.ocrService.getCategoryDisplayName(category);
  }

  getUniqueCategories(): string[] {
    if (!this.ocrResult?.textRegions) return [];
    return [...new Set(this.ocrResult.textRegions.map(r => r.category))];
  }

  reset(): void {
    this.selectedFile = null;
    this.previewUrl = null;
    this.ocrResult = null;
    this.hasResult = false;
    this.errorMessage = null;
    this.activeTab = 'preview';
    this.chatMessages = [];
    this.currentQuestion = '';
    this.highlightedRegion = null;
    this.selectedCategory = null;
    this.loadedImage = null;

    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  hasSectionContent(section: any): boolean {
    if (!section) return false;
    if (typeof section === 'string') return section.trim().length > 0 && section.trim() !== '{}';
    if (Array.isArray(section)) return section.length > 0;
    return true;
  }

  // Parsed data getters
  get patientInfo(): ParsedPatientInfo | undefined {
    return this.ocrResult?.parsedSections?.patientInfo;
  }

  get doctorInfo(): ParsedDoctorInfo | undefined {
    return this.ocrResult?.parsedSections?.doctorInfo;
  }

  get labResults(): ParsedLabResult[] | undefined {
    return this.ocrResult?.parsedSections?.labResults;
  }

  hasPatientInfo(): boolean {
    const info = this.patientInfo;
    return !!(info && (info.name || info.age || info.gender || info.id));
  }

  hasDoctorInfo(): boolean {
    const info = this.doctorInfo;
    return !!(info && (info.name || info.specialization || info.clinicHospital));
  }

  hasLabResults(): boolean {
    return !!(this.labResults && this.labResults.length > 0);
  }

  // Format markdown-like text to HTML
  formatSummary(text: string): SafeHtml {
    if (!text) return '';

    // Convert markdown bold to HTML
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Convert newlines to <br>
    formatted = formatted.replace(/\n/g, '<br>');
    // Convert numbered lists
    formatted = formatted.replace(/^(\d+\.)\s/gm, '<span class="list-number">$1</span> ');

    return this.sanitizer.bypassSecurityTrustHtml(formatted);
  }

  // Get lab result status
  getLabResultStatus(result: ParsedLabResult): 'normal' | 'high' | 'low' | 'unknown' {
    if (result.status) return result.status;
    // Could add logic to determine status from result and reference
    return 'unknown';
  }
}
