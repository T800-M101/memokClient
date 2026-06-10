import { Component, signal } from '@angular/core';
import { Topbar } from './features/topbar/topbar';
import { Sidebar } from './features/sidebar/sidebar';
import { WorkingArea } from './features/working-area/working-area';
import { OverlayMenu } from './features/overlay-menu/overlay-menu';

@Component({
  selector: 'app-root',
  imports: [Topbar, Sidebar, WorkingArea, OverlayMenu],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('memok-client');


}
