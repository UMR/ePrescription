import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgoraService } from '../service/agora.service';
import { LocalStreamComponent } from '../local-stream/local-stream.component';
import { RemoteStreamComponent } from '../remote-stream/remote-stream.component';
import { MediaControlsComponent } from '../media-controls/media-controls.component';

@Component({
    selector: 'app-video-call',
    standalone: true,
    imports: [CommonModule, FormsModule, LocalStreamComponent, RemoteStreamComponent, MediaControlsComponent],
    templateUrl: './video-call.component.html',
    styleUrl: './video-call.component.css'
})
export class VideoCallComponent implements OnDestroy {
    channelName: string = '';
    userId: string = '';
    isInCall: boolean = false;
    isJoining: boolean = false;
    errorMessage: string = '';

    constructor(public agoraService: AgoraService) {
        this.userId = Math.floor(Math.random() * 1000000).toString();
    }

    async joinCall(): Promise<void> {
        if (!this.channelName.trim()) {
            this.errorMessage = 'Please enter a channel name';
            return;
        }

        this.isJoining = true;
        this.errorMessage = '';

        try {
            await this.agoraService.joinChannel(this.channelName, this.userId);
            this.isInCall = true;
        } catch (error: any) {
            console.error('Error joining call:', error);
            this.errorMessage = error.message || 'Failed to join the call. Please try again.';
        } finally {
            this.isJoining = false;
        }
    }

    async leaveCall(): Promise<void> {
        try {
            await this.agoraService.leaveChannel();
            this.isInCall = false;
            this.channelName = '';
        } catch (error) {
            console.error('Error leaving call:', error);
        }
    }

    ngOnDestroy(): void {
        if (this.isInCall) {
            this.leaveCall();
        }
    }
}
