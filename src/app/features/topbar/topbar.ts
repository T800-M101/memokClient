import { Component, inject, input } from '@angular/core';
import { OverlayMenuService } from '../../core/services/overlay-menu-service/overlay-menu.service';

@Component({
  selector: 'app-topbar',
  imports: [],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class Topbar {
  private overlayMenuService = inject(OverlayMenuService);
  title = input<string>();

  get toggleMenu(): void {
    return this.overlayMenuService.toggleMenu();
  }
}
