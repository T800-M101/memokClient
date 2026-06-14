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

  // Estado local del dropdown
  selectedIndex = signal<number>(0);
  isDropdownOpen = false;
  isCopied = false;

  // Input/Output (por si se necesitan)
  requestData = input<ApiRequest>();
  change = output<Partial<ApiRequest>>();

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

  // async sendRequest() {
  //   const current = this.activeRequest();
  //   if (!current?.url) return;

  //   const payload = {
  //     method: current.method,
  //     url: current.url,
  //     headers: current.headers || {},
  //     params: current.params || {},
  //     auth: current.auth || { type: 'none' },
  //     body: current.body || null,
  //   };
  // }


async sendRequest() {
  const current = this.activeRequest();
  if (!current?.url) return;

  // Show loading state
  //this.isLoading = true;
  this.notificationService.info('Sending request...');

  const payload = {
    method: current.method,
    url: current.url,
    headers: current.headers || {},
    params: current.params || {},
    auth: current.auth || { type: 'none' },
    body: current.body || null,
  };

  // Build URL with query parameters
  let finalUrl = payload.url;
  if (payload.params && Object.keys(payload.params).length > 0) {
    const params = new URLSearchParams(payload.params).toString();
    finalUrl = `${payload.url}${payload.url.includes('?') ? '&' : '?'}${params}`;
  }

  // Prepare headers (including auth)
  const headers = { ...payload.headers };

  if (payload.auth?.type === 'bearer' && payload.auth.token) {
    headers['Authorization'] = `Bearer ${payload.auth.token}`;
  } else if (payload.auth?.type === 'basic' && payload.auth.username && payload.auth.password) {
    const credentials = btoa(`${payload.auth.username}:${payload.auth.password}`);
    headers['Authorization'] = `Basic ${credentials}`;
  }

  const requestPayload = {
    method: payload.method,
    headers: headers,
    body: payload.body
  };

  try {
    const response = await lastValueFrom(
      this.requestsService.sendRequest(finalUrl, requestPayload)
    );

    console.log('Request successful:', response);
    this.notificationService.success('Request completed successfully!');

    // Store response in the service
   this.requestsService.setResponse(response);

  } catch (error: any) {
    console.error('Request failed:', error);
    this.notificationService.error(`Request failed: ${error.message || 'Unknown error'}`);
  } finally {
    //this.isLoading = false;
  }
}

  saveRequest(): void {
    const currentRequest = this.requestsService.activeRequest();

    if (!currentRequest) {
      console.warn('No active request to save');
      return;
    }

    this.modalService.openModal(currentRequest);
  }

  async copyAsCurl() {
    const current = this.activeRequest();
    if (!current) return;

    const headers = current.headers || {};
    const body = current.body;

    let curl = `curl -X ${current.method} "${current.url}"`;

    Object.entries(headers).forEach(([key, value]) => {
      curl += ` \\\n  -H "${key}: ${value}"`;
    });

    if (body) {
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      curl += ` \\\n  -d '${bodyStr}'`;
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
