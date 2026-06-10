import { Injectable, signal } from '@angular/core';
import { ProxyResponse } from '../../interfaces/proxy-response.interface';

@Injectable({
  providedIn: 'root',
})
export class RequestsService {
  // Private Signals
  private readonly _response = signal<ProxyResponse | null>(null);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  // Expose signals as readonly
  readonly response = this._response.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  sendRequest(payload: any ): void {

  }

  clearResponse(): void {
    this._response.set(null);
    this._error.set(null);
  }

}
