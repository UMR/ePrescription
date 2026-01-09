import { Component, Input, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, SimpleChanges, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RemoteUser } from '../service/agora.service';

@Component({
  selector: 'app-remote-user',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './remote-user.component.html',
  styleUrl: './remote-user.component.css'
})
export class RemoteUserComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @Input() remoteUser!: RemoteUser;
  @ViewChild('videoContainer', { static: false }) videoContainer!: ElementRef<HTMLDivElement>;
  private checkInterval: any;

  constructor() { }

  ngOnInit(): void { }

  ngAfterViewInit(): void {
    this.playRemoteVideo();
    this.playRemoteAudio();
    this.checkInterval = setInterval(() => {
      this.playRemoteVideo();
      this.playRemoteAudio();
    }, 1000);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['remoteUser'] && this.videoContainer) {
      setTimeout(() => {
        this.playRemoteVideo();
        this.playRemoteAudio();
      }, 100);
    }
  }

  playRemoteVideo(): void {
    if (this.remoteUser?.videoTrack && this.videoContainer?.nativeElement) {
      try {
        const element = this.videoContainer.nativeElement;
        if (!element.hasChildNodes() || element.children.length === 0) {
          this.remoteUser.videoTrack.play(element);
        }
      } catch (error) {
      }
    }
  }

  playRemoteAudio(): void {
    if (this.remoteUser?.audioTrack) {
      try {
        this.remoteUser.audioTrack.play();
      } catch (error) {
      }
    }
  }

  ngOnDestroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }

  get hasVideo(): boolean {
    return !!this.remoteUser?.videoTrack;
  }

  get hasAudio(): boolean {
    return !!this.remoteUser?.audioTrack;
  }

  get userId(): string {
    return this.remoteUser?.user.uid.toString() || 'Unknown';
  }
}

