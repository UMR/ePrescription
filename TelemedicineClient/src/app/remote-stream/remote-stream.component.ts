import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgoraService } from '../service/agora.service';
import { RemoteUserComponent } from '../remote-user/remote-user.component';

@Component({
  selector: 'app-remote-stream',
  standalone: true,
  imports: [CommonModule, RemoteUserComponent],
  templateUrl: './remote-stream.component.html',
  styleUrl: './remote-stream.component.css'
})
export class RemoteStreamComponent implements OnInit, OnDestroy {
  private updateInterval: any;

  constructor(
    public agoraService: AgoraService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.updateInterval = setInterval(() => {
      this.cdr.detectChanges();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  get remoteUsersArray() {
    return Array.from(this.agoraService.remoteUsers.values());
  }
}

