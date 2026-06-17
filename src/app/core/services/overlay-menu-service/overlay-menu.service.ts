import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class OverlayMenuService {
  private _isMenuOpen = signal(false);
  private _isClosing = signal(false);

  readonly isMenuOpen = this._isMenuOpen.asReadonly();
  readonly isClosing = this._isClosing.asReadonly();

  private readonly ANIMATION_DURATION = 300;

  constructor() {}

  toggleMenu(): void {
    if (this._isMenuOpen()) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  openMenu(): void {
    this._isClosing.set(false);
    this._isMenuOpen.set(true);
  }

  closeMenu(): void {
    this._isClosing.set(true);

    setTimeout(() => {
      this._isMenuOpen.set(false);
      this._isClosing.set(false);
    }, this.ANIMATION_DURATION);
  }

}
