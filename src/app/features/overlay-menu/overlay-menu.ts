import { Component, inject } from '@angular/core';
import { OverlayMenuService } from '../../core/overlay-menu.service';

@Component({
  selector: 'app-overlay-menu',
  imports: [],
  templateUrl: './overlay-menu.html',
  styleUrl: './overlay-menu.scss',
})
export class OverlayMenu {
  private overlayMenuService = inject(OverlayMenuService);

  get isMenuOpen(): boolean {
    return this.overlayMenuService.isMenuOpen();
  }

  get isClosing(): boolean {
    return this.overlayMenuService.isClosing();
  }

  closeMenu(): void {
    this.overlayMenuService.closeMenu();
  }

  importCurl(): void {
    this.overlayMenuService.importCurl();
  }
}
