import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, tap } from 'rxjs';

import { ApiRequest } from '../../interfaces/api-request.interface';
import { Collection } from '../../interfaces/collection.interface';
import { ProxyResponse } from '../../interfaces/proxy-response.interface';

// ============================================================================
// REQUESTS SERVICE
// ============================================================================

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
  private readonly _activeRequest = signal<ApiRequest | null>(null);

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
  readonly activeRequest = this._activeRequest.asReadonly();

  // ==========================================================================
  // PUBLIC READONLY SIGNALS - HTTP Response State
  // ==========================================================================

  readonly response = this._response.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

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
      isExpanded: true,
    };

    return this.http.post<Collection>(url, body).pipe(
      tap(() => this.getCollections()), // Refresh global list after creation
    );
  }

  // ==========================================================================
  // REQUEST MANAGEMENT (Individual Request CRUD)
  // ==========================================================================

  /**
   * Adds a new request to the backend
   */
  addRequest(): Observable<ApiRequest> {
    const url = this.getEndpoint('requests');

      const newRequest: Partial<ApiRequest> = {
        requestId: null as any,
        name: '',
        method: 'GET',
        url: '',
        params: {},
        headers: {},
        auth: {
            type: 'none'
        },
        body: null
    };

    return this.http.post<ApiRequest>(url, newRequest).pipe(
      tap((savedRequest) => {
        this.getCollections();
      }),
      catchError((error) => {
        console.error('Error in addRequest:', error);
        throw error;
      }),
    );
  }

  /**
   * Updates an existing request in the backend
   * @param requestId - The ID of the request to update
   * @param request - The updated request data
   */
  updateRequest(requestId: string, request: ApiRequest): Observable<any> {
    const url = this.getEndpoint(`requests/${requestId}`);

    return this.http.put(url, request).pipe(
      tap(() => {
        this.getCollections(); // Refresh collections after update
      }),
      catchError((error) => {
        console.error('Error in updateRequest:', error);
        throw error;
      }),
    );
  }

  // ==========================================================================
  // OPEN REQUESTS MANAGEMENT (Tabs)
  // ==========================================================================

  /**
   * Sets the active request value directly
   * @param request - The request to set as active (or null to clear)
   */
  setActiveRequestValue(request: ApiRequest | null): void {
    this._activeRequest.set(request);
    if (request) {
      this._activeRequestId.set(request.requestId);
    }
  }

  /**
   * Activates a request from a specific collection
   * Opens it as a new tab if not already open
   * @param collectionId - The ID of the collection containing the request
   * @param request - The request to activate
   */
  setActiveRequest(collectionId: string, request: ApiRequest): void {
    this._activeCollectionId.set(collectionId);

    const exists = this._openRequests().find((r) => r.requestId === request.requestId);

    if (exists) {
      this._activeRequestId.set(request.requestId);
    } else {
      this._openRequests.update((requests) => [...requests, request]);
      this._activeRequestId.set(request.requestId);
    }

    this._activeRequest.set(request);
  }

  /**
   * Switches to an already open request without modifying collections
   * @param requestId - The ID of the request to switch to
   */
  switchToRequest(requestId: string): void {
    const request = this._openRequests().find((r) => r.requestId === requestId);
    if (request) {
      this._activeRequestId.set(requestId);
      this._activeRequest.set(request);
    }
  }

  /**
   * Closes a specific open request
   * @param requestId - The ID of the request to close
   */
  closeRequest(requestId: string): void {
    this._openRequests.update((requests) => requests.filter((r) => r.requestId !== requestId));

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

  /**
   * Closes all open requests
   */
  closeAllRequests(): void {
    this._openRequests.set([]);
    this._activeRequestId.set(null);
    this._activeCollectionId.set(null);
  }

  /**
   * Updates the active request with partial changes
   * @param changes - Partial request data to update
   */
  updateActiveRequest(changes: Partial<ApiRequest>): void {
    const current = this.activeRequest();
    if (!current) return;

    const hasChanges = Object.keys(changes).some((key) => {
      const currentValue = (current as any)[key];
      const newValue = (changes as any)[key];
      return JSON.stringify(currentValue) !== JSON.stringify(newValue);
    });

    if (!hasChanges) return;
    const updatedRequest = { ...current, ...changes };

    this._activeRequest.set(updatedRequest);

    this._openRequests.update((requests) =>
      requests.map((req) => (req.requestId === current.requestId ? updatedRequest : req)),
    );

    // Update in collections (Memory)
    this._collections.update((collections) =>
      collections.map((collection) => ({
        ...collection,
        requests: collection.requests.map((req: ApiRequest) =>
          req.requestId === current.requestId ? updatedRequest : req,
        ),
      })),
    );
  }

  /**
   * Helper to find and update the active collection ID from a request
   * @param request - The request to find the collection for
   */
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
 * @returns Observable with the proxy response
 */
sendRequest(
  targetUrl: string,
  requestData: {
    method: string;
    headers?: Record<string, string>;
    body?: any;
  }
): Observable<any> {
  const url = this.getEndpoint('proxy');
  const encodedUrl = encodeURIComponent(targetUrl);
  const fullUrl = `${url}?url=${encodedUrl}`;

  // Prepare the body to send to proxy
  let bodyToSend = requestData.body;

  // If body is an object, stringify it
  if (bodyToSend && typeof bodyToSend === 'object') {
    bodyToSend = JSON.stringify(bodyToSend);
  }

  const proxyPayload = {
    method: requestData.method,
    headers: requestData.headers || {},
    body: bodyToSend || null
  };

  console.log('Sending to proxy:', {
    url: fullUrl,
    payload: proxyPayload
  });

  return this.http.post(fullUrl, proxyPayload).pipe(
    tap((response) => {
      console.log('Proxy response received:', response);
    }),
    catchError((error) => {
      console.error('Proxy request failed:', error);
      throw error;
    })
  );
}

  // ==========================================================================
  // RESPONSE STATE MANAGEMENT
  // ==========================================================================

  /**
   * Sets the response data
   * @param response - The response data to store
   */
  setResponse(response: any): void {
    this._response.set(response);
  }

  /**
   * Clears the current response and any errors
   */
  clearResponse(): void {
    this._response.set(null);
    this._error.set(null);
  }

  /**
 * Creates a new request locally without saving to backend
 * @param collectionId - Optional collection ID to associate with
 * @returns The newly created local request
 */
createLocalRequest(collectionId?: string): void {
  const newRequest: ApiRequest = {
    requestId: `temp-${crypto.randomUUID()}`, // Generate a temporary local ID
    collectionId: collectionId,
    name: '',
    method: 'GET',
    url: '',
    params: {},
    headers: {},
    auth: {
      type: 'none'
    },
    body: null
  };

  // Add to open requests
  this._openRequests.update((requests) => [...requests, newRequest]);

  // Set as active
  this._activeRequestId.set(newRequest.requestId);
  this._activeRequest.set(newRequest);

  if (collectionId) {
    this._activeCollectionId.set(collectionId);
  }

  this.setActiveRequestValue(newRequest);
}

/**
 * Guarda una nueva request directamente en una colección
 * Si la colección no existe, la crea con el nombre proporcionado
 */
addRequestToCollection(collectionId: string, request: ApiRequest, newCollectionName?: string): Observable<ApiRequest> {
  // Buscar la colección actual
  let collection = this._collections().find(c => c.collectionId === collectionId);

  // Crear la request con el collectionId asignado
  const requestWithCollection = {
    ...request,
    collectionId: collectionId,
    // Si es una request temporal, generar un ID real
    requestId: request.requestId.startsWith('temp-') ? crypto.randomUUID() : request.requestId
  };

  // Si no existe la colección, crearla primero
  if (!collection) {
    const collectionName = newCollectionName || `Collection ${collectionId.substring(0, 8)}`;
    console.log(`Creating new collection: ${collectionName} with id ${collectionId}`);

    const newCollection: Collection = {
      collectionId: collectionId,
      name: collectionName, // Usar el nombre proporcionado
      icon: 'fas fa-folder',
      requests: [requestWithCollection],
      isExpanded: true
    };

    // Crear la colección en el backend
    const createUrl = this.getEndpoint('collections');

    return this.http.post<Collection>(createUrl, newCollection).pipe(
      map((savedCollection) => {
        // Actualizar colecciones en memoria
        this._collections.update(collections => [...collections, savedCollection]);

        // Actualizar openRequests
        this._openRequests.update(requests =>
          requests.map(req =>
            req.requestId === request.requestId ? requestWithCollection : req
          )
        );

        // Actualizar activeRequest si es necesario
        if (this._activeRequest()?.requestId === request.requestId) {
          this._activeRequest.set(requestWithCollection);
          this._activeRequestId.set(requestWithCollection.requestId);
        }

        this.getCollections(); // Refrescar
        return requestWithCollection;
      }),
      catchError((error) => {
        console.error('Error creating collection and request:', error);
        throw error;
      })
    );
  }

  // Si la colección existe, agregar la request
  const updatedCollection = {
    ...collection,
    requests: [...collection.requests, requestWithCollection]
  };

  const url = this.getEndpoint(`collections/${collectionId}`);

  return this.http.put<Collection>(url, updatedCollection).pipe(
    map((savedCollection) => {
      const savedRequest = savedCollection.requests.find(r => r.requestId === requestWithCollection.requestId);

      if (!savedRequest) {
        throw new Error('Request not found in saved collection');
      }

      // Actualizar la colección en memoria
      this._collections.update(collections =>
        collections.map(col =>
          col.collectionId === collectionId ? savedCollection : col
        )
      );

      // Actualizar openRequests
      this._openRequests.update(requests =>
        requests.map(req =>
          req.requestId === request.requestId ? savedRequest : req
        )
      );

      // Actualizar activeRequest
      if (this._activeRequest()?.requestId === request.requestId) {
        this._activeRequest.set(savedRequest);
        this._activeRequestId.set(savedRequest.requestId);
      }

      this.getCollections();
      return savedRequest;
    }),
    catchError((error) => {
      console.error('Error adding request to collection:', error);
      throw error;
    })
  );
}

/**
 * Guarda una nueva colección en el backend
 */
private saveNewCollection(collectionId: string, collection: Collection): void {
  const url = this.getEndpoint('collections');

  this.http.post<Collection>(url, collection).subscribe({
    next: (savedCollection) => {
      console.log('New collection saved to backend:', savedCollection);
      this.getCollections(); // Refrescar todas las colecciones
    },
    error: (error) => {
      console.error('Error saving new collection:', error);
    }
  });
}

/**
 * Mueve una request entre colecciones - Versión simplificada
 */
moveRequest(request: ApiRequest, fromCollectionId: string, toCollectionId: string): Observable<any> {
  // Actualizar la request con el nuevo collectionId
  const updatedRequest = {
    ...request,
    collectionId: toCollectionId
  };

  // Actualizar la request en el backend
  return this.updateRequest(request.requestId, updatedRequest).pipe(
    tap(() => {
      // Refrescar colecciones
      this.getCollections();
    })
  );
}
}
