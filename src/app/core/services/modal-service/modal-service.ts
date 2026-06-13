import { inject, Injectable, signal } from '@angular/core';
import { ApiRequest } from '../../interfaces/api-request.interface';
import { RequestsService } from '../requests-service/requests-service';

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  private readonly requestService = inject(RequestsService);
  private readonly _isOpen = signal(false);
  private readonly _isClosing = signal(false);

  readonly isOpen = this._isOpen.asReadonly();
  readonly isClosing = this._isClosing.asReadonly();


openModal(request?: ApiRequest | null): void {
  if (request) {
    this.requestService.setActiveRequestValue(request);
  }

  this._isClosing.set(false);
  this._isOpen.set(true);
}

  closeModal(): void {
    this._isClosing.set(true);
    setTimeout(() => {
      this._isOpen.set(false);
      this._isClosing.set(false);
    }, 250);
  }
}
