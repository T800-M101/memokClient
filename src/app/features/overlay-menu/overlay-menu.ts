import { Component, inject, signal } from '@angular/core';
import { OverlayMenuService } from '../../core/overlay-menu.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-overlay-menu',
  imports: [FormsModule],
  templateUrl: './overlay-menu.html',
  styleUrl: './overlay-menu.scss',
})
export class OverlayMenu {
  private overlayMenuService = inject(OverlayMenuService);

  isImportDrawerOpen = signal(false);
  isImportDrawerClosing = signal(false);
  curlCommand = '';

  get isMenuOpen(): boolean {
    return this.overlayMenuService.isMenuOpen();
  }

  get isClosing(): boolean {
    return this.overlayMenuService.isClosing();
  }

  closeMenu(): void {
    this.overlayMenuService.closeMenu();
  }

  toggleImportDrawer(): void {
    if (this.isImportDrawerOpen()) {
      this.closeImportDrawer();
    } else {
      this.openImportDrawer();
    }
  }

  openImportDrawer(): void {
    this.isImportDrawerClosing.set(false);
    this.isImportDrawerOpen.set(true);
  }

  closeImportDrawer(): void {
    this.isImportDrawerClosing.set(true);

    setTimeout(() => {
      this.isImportDrawerOpen.set(false);
      this.isImportDrawerClosing.set(false);
      this.curlCommand = '';
    }, 250);
  }

  importCurl(): void {
    if (!this.curlCommand.trim()) return;

    this.overlayMenuService.importCurl();
    console.log('Importing cURL:', this.curlCommand);
    // Aquí va la lógica para parsear e importar el cURL
    this.closeImportDrawer();
  }
}
