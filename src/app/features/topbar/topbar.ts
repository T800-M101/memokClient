import { Component, inject } from '@angular/core';
import { OverlayMenuService } from '../../core/overlay-menu.service';

@Component({
  selector: 'app-topbar',
  imports: [],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class Topbar {
  private overlayMenuService = inject(OverlayMenuService);

  get toggleMenu(): void {
    return this.overlayMenuService.toggleMenu();
  }
}
