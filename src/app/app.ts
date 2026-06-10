import { Component, HostListener, inject, signal } from '@angular/core';
import { Topbar } from './features/topbar/topbar';
import { Sidebar } from './features/sidebar/sidebar';
import { WorkingArea } from './features/working-area/working-area';
import { OverlayMenu } from './features/overlay-menu/overlay-menu';
import { OverlayMenuService } from './core/overlay-menu.service';

@Component({
  selector: 'app-root',
  imports: [Topbar, Sidebar, WorkingArea, OverlayMenu],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('memok-client');
  overlayMenuService = inject(OverlayMenuService);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const isMenuButton = target.closest('.menu-toggle');
    const isOverlayMenu = target.closest('.overlay-menu');

    if (this.overlayMenuService.isMenuOpen() && !isMenuButton && !isOverlayMenu) {
      this.overlayMenuService.closeMenu();
    }
  }


}
