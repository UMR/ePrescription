import { Routes } from '@angular/router';
import { VideoCallComponent } from './video-call/video-call.component';

export const routes: Routes = [
    { path: '', redirectTo: '/call', pathMatch: 'full' },
    { path: 'call', component: VideoCallComponent }
];

