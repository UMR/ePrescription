import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  ILocalVideoTrack,
  ILocalAudioTrack,
  IRemoteVideoTrack,
  IRemoteAudioTrack,
  UID
} from 'agora-rtc-sdk-ng';
import { environment } from '../../environments/environment';

export interface TokenResponse {
  appId: string;
  channelName: string;
  uid: number;
  token: string;
  expiresIn: number;
}

export interface RemoteUser {
  user: IAgoraRTCRemoteUser;
  videoTrack?: IRemoteVideoTrack;
  audioTrack?: IRemoteAudioTrack;
}

@Injectable({
  providedIn: 'root'
})
export class AgoraService {
  private client: IAgoraRTCClient | null = null;
  private localVideoTrack: ICameraVideoTrack | null = null;
  private localAudioTrack: IMicrophoneAudioTrack | null = null;
  private screenTrack: ILocalVideoTrack | null = null;
  private appId: string = '';

  public remoteUsers: Map<UID, RemoteUser> = new Map();
  public isJoined = false;
  public isVideoEnabled = true;
  public isAudioEnabled = true;
  public isScreenSharing = false;

  constructor(private http: HttpClient) {
    AgoraRTC.setLogLevel(4);
  }

  async getRtcToken(channelName: string, userId: string): Promise<TokenResponse> {
    const url = `${environment.apiUrl}/Agora/rtc-token?channelName=${channelName}&userId=${userId}`;
    return firstValueFrom(this.http.get<TokenResponse>(url));
  }

  async joinChannel(channelName: string, userId: string): Promise<void> {
    try {
      const tokenData = await this.getRtcToken(channelName, userId);
      this.appId = tokenData.appId;
      this.client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      this.setupClientListeners();
      await this.client.join(tokenData.appId, channelName, tokenData.token, tokenData.uid);
      this.isJoined = true;
      await this.createLocalTracks();
      if (this.localAudioTrack && this.localVideoTrack) {
        await this.client.publish([this.localAudioTrack, this.localVideoTrack]);
      }
    } catch (error) {
      console.error('Error joining channel:', error);
      throw error;
    }
  }

  private setupClientListeners(): void {
    if (!this.client) return;

    this.client.on('user-published', async (user, mediaType) => {
      try {
        await this.client!.subscribe(user, mediaType);

        let remoteUser = this.remoteUsers.get(user.uid);
        if (!remoteUser) {
          remoteUser = { user };
          this.remoteUsers.set(user.uid, remoteUser);
        }

        if (mediaType === 'video') {
          remoteUser.videoTrack = user.videoTrack;
        }
        if (mediaType === 'audio') {
          remoteUser.audioTrack = user.audioTrack;
          if (user.audioTrack) {
            user.audioTrack.play();
          }
        }
      } catch (error) {
        console.error('Error subscribing to user:', error);
      }
    });

    this.client.on('user-unpublished', (user, mediaType) => {
      const remoteUser = this.remoteUsers.get(user.uid);
      if (remoteUser) {
        if (mediaType === 'video') {
          remoteUser.videoTrack = undefined;
        }
        if (mediaType === 'audio') {
          remoteUser.audioTrack = undefined;
        }
      }
    });

    this.client.on('user-left', (user) => {
      this.remoteUsers.delete(user.uid);
    });
  }

  private async createLocalTracks(): Promise<void> {
    try {
      [this.localAudioTrack, this.localVideoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
    } catch (error) {
      console.error('Error creating local tracks:', error);
      throw error;
    }
  }

  async toggleVideo(): Promise<void> {
    if (this.localVideoTrack) {
      await this.localVideoTrack.setEnabled(!this.isVideoEnabled);
      this.isVideoEnabled = !this.isVideoEnabled;
    }
  }

  async toggleAudio(): Promise<void> {
    if (this.localAudioTrack) {
      await this.localAudioTrack.setEnabled(!this.isAudioEnabled);
      this.isAudioEnabled = !this.isAudioEnabled;
    }
  }

  async toggleScreenShare(): Promise<void> {
    if (!this.client) return;

    try {
      if (!this.isScreenSharing) {
        const screenTrack = await AgoraRTC.createScreenVideoTrack({});

        if (Array.isArray(screenTrack)) {
          this.screenTrack = screenTrack[0];
        } else {
          this.screenTrack = screenTrack;
        }
        if (this.localVideoTrack) {
          await this.client.unpublish([this.localVideoTrack]);
        }
        if (this.screenTrack) {
          await this.client.publish([this.screenTrack]);
          this.isScreenSharing = true;
          this.screenTrack.on('track-ended', async () => {
            await this.stopScreenShare();
          });
        }
      } else {
        await this.stopScreenShare();
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      this.isScreenSharing = false;
    }
  }

  private async stopScreenShare(): Promise<void> {
    if (!this.client) return;

    if (this.screenTrack) {
      this.screenTrack.stop();
      this.screenTrack.close();
      await this.client.unpublish([this.screenTrack]);
      this.screenTrack = null;
    }
    if (this.localVideoTrack) {
      await this.client.publish([this.localVideoTrack]);
    }

    this.isScreenSharing = false;
  }

  async leaveChannel(): Promise<void> {
    try {
      this.localAudioTrack?.close();
      this.localVideoTrack?.close();
      this.screenTrack?.close();
      if (this.client) {
        await this.client.leave();
      }
      this.localAudioTrack = null;
      this.localVideoTrack = null;
      this.screenTrack = null;
      this.client = null;
      this.isJoined = false;
      this.isVideoEnabled = true;
      this.isAudioEnabled = true;
      this.isScreenSharing = false;
      this.remoteUsers.clear();
    } catch (error) {
      console.error('Error leaving channel:', error);
      throw error;
    }
  }

  getLocalVideoTrack(): ICameraVideoTrack | ILocalVideoTrack | null {
    return this.isScreenSharing ? this.screenTrack : this.localVideoTrack;
  }

  getLocalAudioTrack(): IMicrophoneAudioTrack | null {
    return this.localAudioTrack;
  }
}
