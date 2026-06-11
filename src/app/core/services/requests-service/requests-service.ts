import { inject, Injectable, signal } from '@angular/core';
import { ProxyResponse } from '../../interfaces/proxy-response.interface';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ApiRequest } from '../../interfaces/api-request.interface';
import { Collection } from '../../interfaces/collection.interface';

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

createCollection(name: string, requests: ApiRequest[] = []): Observable<Collection> {
  const url = this.getEndpoint('collections');
  const body: Partial<Collection> = {
    collectionId: crypto.randomUUID(),
    name,
    icon: 'fas fa-folder',
    requests
  };
console.log('Payload enviado al servidor:', JSON.stringify(body, null, 2));
  return this.http.post<Collection>(url, body).pipe(
    tap(() => this.getCollections()) // Refresh global list
  );
}

addRequest(request: ApiRequest): Observable<any> {
  const url = this.getEndpoint('requests');

  return this.http.post(url, request).pipe(
    tap(() => {
      this.getCollections();
    })
  );
}

  clearResponse(): void {
    this._response.set(null);
    this._error.set(null);
  }
}
