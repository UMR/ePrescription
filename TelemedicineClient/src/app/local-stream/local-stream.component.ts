import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgoraService } from '../service/agora.service';

@Component({
  selector: 'app-local-stream',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './local-stream.component.html',
  styleUrl: './local-stream.component.css'
})
export class LocalStreamComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('videoContainer', { static: false }) videoContainer!: ElementRef<HTMLDivElement>;

  private currentTrackId: string = '';
  private checkInterval: any;

  constructor(public agoraService: AgoraService) { }

  ngOnInit(): void { }

  ngAfterViewInit(): void {
    this.playLocalVideo();
    this.checkInterval = setInterval(() => {
      this.playLocalVideo();
    }, 1000);
  }

  playLocalVideo(): void {
    const videoTrack = this.agoraService.getLocalVideoTrack();
    if (videoTrack && this.videoContainer?.nativeElement) {
      try {
        const trackId = (videoTrack as any).trackMediaStreamId || videoTrack.getTrackId();
        if (this.currentTrackId !== trackId || !this.videoContainer.nativeElement.hasChildNodes()) {
          const element = this.videoContainer.nativeElement;
          while (element.firstChild) {
            element.removeChild(element.firstChild);
          }
          videoTrack.play(element);
          this.currentTrackId = trackId;
        }
      } catch (error) {
      }
    }
  }

  ngOnDestroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}

