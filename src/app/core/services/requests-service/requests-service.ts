import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { ApiRequest } from '../../interfaces/api-request.interface';
import { Collection } from '../../interfaces/collection.interface';
import { ProxyResponse } from '../../interfaces/proxy-response.interface';

@Injectable({ providedIn: 'root' })
export class RequestsService {
  // ==========================================================================
  // DEPENDENCIES & PROPERTIES
  // ==========================================================================

  private readonly http = inject(HttpClient);
  private readonly apiBase = '/api';

  // ==========================================================================
  // PRIVATE SIGNALS - Collections
  // ==========================================================================

  private readonly _collections = signal<Collection[]>([]);

  // ==========================================================================
  // PRIVATE SIGNALS - Open Requests (Tabs)
  // ==========================================================================

  private readonly _openRequests = signal<ApiRequest[]>([]);
  private readonly _activeRequestId = signal<string | null>(null);
  private readonly _activeCollectionId = signal<string | null>(null);

  // ==========================================================================
  // PRIVATE SIGNALS - HTTP Response State
  // ==========================================================================

  private readonly _response = signal<ProxyResponse | null>(null);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  // ==========================================================================
  // PUBLIC READONLY SIGNALS - Collections
  // ==========================================================================

  readonly collections = this._collections.asReadonly();

  // ==========================================================================
  // PUBLIC READONLY SIGNALS - Open Requests
  // ==========================================================================

  readonly openRequests = this._openRequests.asReadonly();
  readonly activeRequestId = this._activeRequestId.asReadonly();
  readonly activeCollectionId = this._activeCollectionId.asReadonly();

  // ==========================================================================
  // PUBLIC READONLY SIGNALS - HTTP Response State
  // ==========================================================================

  readonly response = this._response.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  // ==========================================================================
  // COMPUTED SIGNALS
  // ==========================================================================

  /** Returns the complete active request object or null */
  readonly activeRequest = computed(() => {
    const id = this._activeRequestId();
    return this._openRequests().find(req => req.requestId === id) || null;
  });

  // ==========================================================================
  // PRIVATE UTILITIES
  // ==========================================================================

  /**
   * Builds a consistent API endpoint URL.
   * Ensures the path always starts with /api and removes duplicate slashes.
   */
  private getEndpoint(path: string): string {
    return `${this.apiBase}/${path.replace(/^\//, '')}`;
  }

  // ==========================================================================
  // COLLECTION MANAGEMENT
  // ==========================================================================

  /** Fetches all collections from the backend */
  getCollections(): void {
    const url = this.getEndpoint('collections');

    this.http.get<Collection[]>(url).subscribe({
      next: (data) => this._collections.set(data),
      error: (err) => console.error('Error loading collections:', err),
    });
  }

  /**
   * Creates a new collection
   * @param name - Collection name
   * @param requests - Optional initial requests
   */
  createCollection(name: string, requests: ApiRequest[] = []): Observable<Collection> {
    const url = this.getEndpoint('collections');
    const body: Partial<Collection> = {
      collectionId: crypto.randomUUID(),
      name,
      icon: 'fas fa-folder',
      requests,
      isExpanded: true
    };


    return this.http.post<Collection>(url, body).pipe(
      tap(() => this.getCollections()) // Refresh global list after creation
    );
  }

  // ==========================================================================
  // REQUEST MANAGEMENT (Individual Request CRUD)
  // ==========================================================================

  /**
   * Adds a new request to the backend
   * @param request - The request to save
   */
  addRequest(request: ApiRequest): Observable<any> {
    const url = this.getEndpoint('requests');

    return this.http.post(url, request).pipe(
      tap(() => this.getCollections()) // Refresh collections after adding
    );
  }

  // ==========================================================================
  // OPEN REQUESTS MANAGEMENT (Tabs)
  // ==========================================================================

  /**
   * Activates a request from a specific collection
   * Opens it as a new tab if not already open
   */
  setActiveRequest(collectionId: string, request: ApiRequest): void {
    this._activeCollectionId.set(collectionId);

    const exists = this._openRequests().find(r => r.requestId === request.requestId);

    if (exists) {
      this._activeRequestId.set(request.requestId);
    } else {
      this._openRequests.update(requests => [...requests, request]);
      this._activeRequestId.set(request.requestId);
    }
  }

  /** Switches to an already open request without modifying collections */
  switchToRequest(requestId: string): void {
    const request = this._openRequests().find(r => r.requestId === requestId);
    if (request) {
      this._activeRequestId.set(requestId);
    }
  }

  /** Closes a specific open request */
  closeRequest(requestId: string): void {
    this._openRequests.update(requests => requests.filter(r => r.requestId !== requestId));

    // If the closed request was active, activate another one
    if (this._activeRequestId() === requestId) {
      const remaining = this._openRequests();

      if (remaining.length > 0) {
        this._activeRequestId.set(remaining[0].requestId);
        this.updateActiveCollectionFromRequest(remaining[0]);
      } else {
        this._activeRequestId.set(null);
        this._activeCollectionId.set(null);
      }
    }
  }

  /** Closes all open requests */
  closeAllRequests(): void {
    this._openRequests.set([]);
    this._activeRequestId.set(null);
    this._activeCollectionId.set(null);
  }

  /** Updates the active request with partial changes */
  updateActiveRequest(changes: Partial<ApiRequest>): void {
    const current = this.activeRequest();
    if (!current) return;

    // Update in open requests list
    this._openRequests.update(requests =>
      requests.map(req =>
        req.requestId === current.requestId ? { ...req, ...changes } : req
      )
    );

    // Update in collections
    this._collections.update(collections =>
      collections.map(collection => ({
        ...collection,
        requests: collection.requests.map((req: ApiRequest) =>
          req.requestId === current.requestId ? { ...req, ...changes } : req
        ),
      }))
    );
  }

  /** Helper to find and update the active collection ID from a request */
  private updateActiveCollectionFromRequest(request: ApiRequest): void {
    for (const collection of this._collections()) {
      if (collection.requests.some((req: ApiRequest) => req.requestId === request.requestId)) {
        this._activeCollectionId.set(collection.collectionId);
        break;
      }
    }
  }

  // ==========================================================================
  // PROXY REQUEST (HTTP Client)
  // ==========================================================================

  /**
   * Sends an HTTP request through the backend proxy
   * @param targetUrl - The actual URL to call
   * @param requestData - The request payload (method, headers, body, etc.)
   */
  sendRequest(targetUrl: string, requestData: any): void {
    const url = this.getEndpoint('proxy');
    const encodedUrl = encodeURIComponent(targetUrl);

    // this.http.post(`${url}?url=${encodedUrl}`, requestData)...
  }

  // ==========================================================================
  // RESPONSE STATE MANAGEMENT
  // ==========================================================================

  /** Clears the current response and any errors */
  clearResponse(): void {
    this._response.set(null);
    this._error.set(null);
  }
}
