import { Component, computed, HostListener, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RequestsService } from '../../../core/services/requests-service/requests-service';
import { ApiRequest } from '../../../core/interfaces/api-request.interface';
import { ModalService } from '../../../core/services/modal-service/modal-service';
import { NotificationService } from '../../../core/services/notifications/notification-service';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-request-bar',
  imports: [FormsModule],
  templateUrl: './request-bar.html',
  styleUrl: './request-bar.scss',
})
export class RequestBar {
  private requestsService = inject(RequestsService);
  private modalService = inject(ModalService);
  private notificationService = inject(NotificationService);

  // Signals del servicio
  readonly activeRequest = this.requestsService.activeRequest;
  readonly openRequests = this.requestsService.openRequests;

  // Computed values - estos se actualizan automáticamente cuando cambia activeRequest
  readonly totalRequests = computed(() => this.openRequests().length);
  readonly hasPrevious = computed(() => this.currentIndex() > 0);
  readonly hasNext = computed(() => this.currentIndex() < this.totalRequests() - 1);
  readonly method = computed(() => this.activeRequest()?.method || 'GET');
  readonly url = computed(() => this.activeRequest()?.url || '');
  readonly requestName = computed(() => this.activeRequest()?.name || '');

  readonly currentIndex = computed(() => {
    const current = this.activeRequest();
    if (!current) return 0;
    return this.openRequests().findIndex((r) => r.requestId === current.requestId);
  });

    // Señales del servicio
  isLoading = this.requestsService.isLoading;

 


  isDropdownOpen = false;
  isCopied = false;


  ngOnInit() {}

  @HostListener('document:click')
  closeDropdown() {
    this.isDropdownOpen = false;
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  onUrlChange(url: string): void {
    this.requestsService.updateActiveRequest({ url });
  }

  onMethodChange(method: string) {
    this.requestsService.updateActiveRequest({ method: method as any });
  }

  onRequestNameChange(name: string): void {
    this.requestsService.updateActiveRequest({ name });
  }



async sendRequest() {
  const current = this.activeRequest();
  if (!current?.url) return;

  //this.isLoading = true;
  this.notificationService.info('Sending request...');

  // Build URL with query parameters
  let finalUrl = current.url;
  if (current.params && Object.keys(current.params).length > 0) {
    const params = new URLSearchParams(current.params).toString();
    const separator = finalUrl.includes('?') ? '&' : '?';
    finalUrl = `${finalUrl}${separator}${params}`;
  }

  // Prepare headers (excluding Content-Type for body handling)
  const headers: Record<string, string> = {};

  // Copy existing headers
  if (current.headers) {
    Object.entries(current.headers).forEach(([key, value]) => {
      headers[key] = value;
    });
  }

  // Add auth headers if present
  if (current.auth?.type === 'bearer' && current.auth.token) {
    headers['Authorization'] = `Bearer ${current.auth.token}`;
  } else if (current.auth?.type === 'basic' && current.auth.username && current.auth.password) {
    const credentials = btoa(`${current.auth.username}:${current.auth.password}`);
    headers['Authorization'] = `Basic ${credentials}`;
  }

  // Prepare body
  let requestBody = null;
  if (current.body) {
    // If body is a string, try to parse it, otherwise use as is
    if (typeof current.body === 'string') {
      try {
        requestBody = JSON.parse(current.body);
        // Ensure Content-Type is set for JSON
        if (!headers['Content-Type'] && !headers['content-type']) {
          headers['Content-Type'] = 'application/json';
        }
      } catch {
        // If not valid JSON, send as raw string
        requestBody = current.body;
      }
    } else {
      requestBody = current.body;
      if (!headers['Content-Type'] && !headers['content-type']) {
        headers['Content-Type'] = 'application/json';
      }
    }
  }

  const requestPayload = {
    method: current.method,
    headers: headers,
    body: requestBody
  };

  console.log('Sending request:', {
    url: finalUrl,
    method: requestPayload.method,
    headers: requestPayload.headers,
    body: requestPayload.body
  });

  try {
    const response = await lastValueFrom(
      this.requestsService.sendRequest(finalUrl, requestPayload)
    );

    console.log('Response received:', response);
    this.requestsService.setResponse(response);
    this.notificationService.success('Request completed successfully!');
  } catch (error: any) {
    console.error('Request failed:', error);
    this.notificationService.error(`Request failed: ${error.message || 'Unknown error'}`);
  } finally {
    //this.isLoading = false;
  }
}

   saveRequest(): void {
    const currentRequest = this.activeRequest();

    if (!currentRequest) {
      console.warn('No active request to save');
      return;
    }

    // Verificar si es una request nueva (ID temporal o sin guardar en backend)
    const isNewRequest = this.isTemporaryRequest(currentRequest);
    console.log('IS NEW REQUEST', isNewRequest)

    if (isNewRequest) {
      // Abrir modal para nueva request (seleccionar colección)
      this.openModalForNewRequest(currentRequest);
    } else {
      // Actualizar request existente
      this.updateExistingRequest(currentRequest);
    }
  }

   private isTemporaryRequest(request: ApiRequest): boolean {
    // Verifica si la request tiene un ID temporal o no está asociada a ninguna colección
    const collections = this.requestsService.collections();
    const isInAnyCollection = collections.some(collection =>
      collection.requests.some(req => req.requestId === request.requestId)
    );

    return !isInAnyCollection || request.requestId.startsWith('temp-');
  }

  private openModalForNewRequest(request: ApiRequest): void {
    this.modalService.openModal(request);
    // Puedes pasar la request al modal si necesitas
  }

  private updateExistingRequest(request: ApiRequest): void {
    // Mostrar indicador de carga
    this.requestsService.updateRequest(request.requestId, request).subscribe({
      next: () => {
        console.log('Request updated successfully');
        // Mostrar notificación de éxito si deseas
      },
      error: (error) => {
        console.error('Error updating request:', error);
        // Mostrar mensaje de error
      }
    });
  }

 async copyAsCurl() {
  const current = this.activeRequest();
  if (!current) return;

  // Build URL with query parameters
  let fullUrl = current.url;
  if (current.params && Object.keys(current.params).length > 0) {
    const params = new URLSearchParams(current.params).toString();
    const separator = fullUrl.includes('?') ? '&' : '?';
    fullUrl = `${fullUrl}${separator}${params}`;
  }

  const headers = current.headers || {};
  const body = current.body;

  // Start building curl command
  let curl = `curl -X ${current.method} "${fullUrl}"`;

  // Add headers
  Object.entries(headers).forEach(([key, value]) => {
    // Escape double quotes in header values
    const escapedValue = value.replace(/"/g, '\\"');
    curl += ` \\\n  -H "${key}: ${escapedValue}"`;
  });

  // Add body for methods that support it
  if (body && (current.method === 'POST' || current.method === 'PUT' || current.method === 'PATCH')) {
    let bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    // Escape single quotes in body
    bodyStr = bodyStr.replace(/'/g, "'\\''");
    curl += ` \\\n  -d '${bodyStr}'`;
  }

  // Add content-type header if body is present and not already specified
  if (body && !headers['Content-Type'] && !headers['content-type']) {
    curl += ` \\\n  -H "Content-Type: application/json"`;
  }

  try {
    await navigator.clipboard.writeText(curl);
    this.isCopied = true;
    setTimeout(() => {
      this.isCopied = false;
    }, 2000);
  } catch (error) {
    console.error('Failed to copy:', error);
  }
}

  navigatePrevious(): void {
    if (this.hasPrevious()) {
      const prevRequest = this.openRequests()[this.currentIndex() - 1];
      if (prevRequest) {
        this.requestsService.switchToRequest(prevRequest.requestId);
      }
    }
  }

  navigateNext(): void {
    if (this.hasNext()) {
      const nextRequest = this.openRequests()[this.currentIndex() + 1];
      if (nextRequest) {
        this.requestsService.switchToRequest(nextRequest.requestId);
      }
    }
  }

  goToRequest(index: number): void {
    const request = this.openRequests()[index];
    if (request) {
      this.requestsService.switchToRequest(request.requestId);
    }
    this.isDropdownOpen = false;
  }

  closeRequest(index: number, event: Event): void {
    event.stopPropagation();
    const request = this.openRequests()[index];
    if (request) {
      this.requestsService.closeRequest(request.requestId);
    }
    this.isDropdownOpen = false;
  }

  closeCurrentRequest(): void {
    const current = this.activeRequest();
    if (current) {
      if (this.totalRequests() === 1) {
        const emptyRequest: ApiRequest = {
          requestId: crypto.randomUUID(),
          name: '',
          method: 'GET',
          url: '',
          params: {},
          headers: {},
          auth: { type: 'none' },
          body: null,
        };
        this.requestsService.setActiveRequest('', emptyRequest);
      }
      this.requestsService.closeRequest(current.requestId);
    }
  }

  closeAllRequests(): void {
    this.requestsService.closeAllRequests();
    this.isDropdownOpen = false;
  }
}
