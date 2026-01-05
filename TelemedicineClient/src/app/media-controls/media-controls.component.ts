import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgoraService } from '../service/agora.service';

@Component({
  selector: 'app-media-controls',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './media-controls.component.html',
  styleUrl: './media-controls.component.css'
})
export class MediaControlsComponent {
  @Output() onLeaveCall = new EventEmitter<void>();

  constructor(public agoraService: AgoraService) { }

  async toggleVideo(): Promise<void> {
    await this.agoraService.toggleVideo();
  }

  async toggleAudio(): Promise<void> {
    await this.agoraService.toggleAudio();
  }

  async toggleScreenShare(): Promise<void> {
    await this.agoraService.toggleScreenShare();
  }

  leaveCall(): void {
    this.onLeaveCall.emit();
  }
}

