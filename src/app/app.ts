import { Component, inject, OnInit, signal,  } from '@angular/core';
import { Topbar } from './features/topbar/topbar';
import { Sidebar } from './features/sidebar/sidebar';
import { WorkingArea } from './features/working-area/working-area';
import { OverlayMenu } from './features/overlay-menu/overlay-menu';
import { OverlayMenuService } from './core/services/overlay-menu-service/overlay-menu.service';
import { Modal } from './shared/modal/modal';
import { RequestsService } from './core/services/requests-service/requests-service';
import { NotificationComponent } from './shared/notification/notification.component';

@Component({
  selector: 'app-root',
  imports: [Topbar, Sidebar, WorkingArea, OverlayMenu, Modal, NotificationComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly requestsService = inject(RequestsService);
  protected readonly title = signal('memok-client');
  overlayMenuService = inject(OverlayMenuService);

  ngOnInit(): void {
    this.requestsService.getCollections();
  }
}
