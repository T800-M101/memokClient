import { Injectable, signal } from '@angular/core';
import { ApiRequest } from '../../interfaces/api-request.interface';

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  private _isOpen = signal(false);
  private _requestToEdit = signal<ApiRequest | null>(null);
  private _isClosing = signal(false);

  readonly isOpen = this._isOpen.asReadonly();
  readonly isClosing = this._isClosing.asReadonly();
  readonly requestToEdit = this._requestToEdit.asReadonly();

  openModal(request?: ApiRequest | null): void {
    this._requestToEdit.set(request || null);
    this._isClosing.set(false);
    this._isOpen.set(true);
  }

  closeModal(): void {
    this._isClosing.set(true);
    setTimeout(() => {
      this._isOpen.set(false);
      this._isClosing.set(false);
      this._requestToEdit.set(null);
    }, 250);
  }
}
