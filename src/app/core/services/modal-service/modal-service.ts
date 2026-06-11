import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ModalService {
private _isOpen = signal(false);
  private _isClosing = signal(false);

  readonly isOpen = this._isOpen.asReadonly();
  readonly isClosing = this._isClosing.asReadonly();

  open(): void {
    this._isClosing.set(false);
    this._isOpen.set(true);
  }

  close(): void {
    this._isClosing.set(true);

    setTimeout(() => {
      this._isOpen.set(false);
      this._isClosing.set(false);
    }, 250);
  }
}
