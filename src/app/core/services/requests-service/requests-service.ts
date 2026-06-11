import { inject, Injectable, signal } from '@angular/core';
import { ProxyResponse } from '../../interfaces/proxy-response.interface';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class RequestsService {

  private readonly _collections = signal<any[]>([]);
  readonly collections = this._collections.asReadonly();

  private readonly http = inject(HttpClient);
  private readonly apiBase = '/api';

  // Signals
  private readonly _response = signal<ProxyResponse | null>(null);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  readonly response = this._response.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  // Ensure that it always starts with /api and remove duplicate slashes.
  private getEndpoint(path: string): string {
    return `${this.apiBase}/${path.replace(/^\//, '')}`;
  }

  sendRequest(targetUrl: string, requestData: any): void {
    const url = this.getEndpoint('proxy');
    const encodedUrl = encodeURIComponent(targetUrl);

    //this.http.post(`${url}?url=${encodedUrl}`, requestData)...
  }

 getCollections(): void {
  const url = this.getEndpoint('collections');

  this.http.get<any[]>(url).subscribe({
    next: (data) => {
      this._collections.set(data); 
    },
    error: (err) => {
      console.error('Error al cargar colecciones:', err);
    }
  });
}

  clearResponse(): void {
    this._response.set(null);
    this._error.set(null);
  }
}
