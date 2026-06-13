import { Component, computed, HostListener, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RequestsService } from '../../../core/services/requests-service/requests-service';
import { ApiRequest } from '../../../core/interfaces/api-request.interface';
import { ModalService } from '../../../core/services/modal-service/modal-service';

@Component({
  selector: 'app-request-bar',
  imports: [FormsModule],
  templateUrl: './request-bar.html',
  styleUrl: './request-bar.scss',
})
export class RequestBar {
  private requestsService = inject(RequestsService);
  private modalService = inject(ModalService);
  readonly activeRequest = this.requestsService.activeRequest;
  readonly openRequests = this.requestsService.openRequests;
  readonly totalRequests = computed(() => this.openRequests().length);
  readonly hasPrevious = computed(() => this.currentIndex() > 0);
  readonly hasNext = computed(() => this.currentIndex() < this.totalRequests() - 1);

  request = this.requestsService.activeRequest;
  selectedIndex = signal<number>(0);
  isDropdownOpen = false;
  requestData = input<ApiRequest>();
  change = output<Partial<ApiRequest>>();
  method = 'GET';
  url = '';
  isCopied = false;

  get requestName(): string {
    return this.activeRequest()?.name || '';
  }

  readonly currentIndex = computed(() => {
    const current = this.activeRequest();
    if (!current) return 0;
    return this.openRequests().findIndex((r) => r.requestId === current.requestId);
  });


  ngOnInit() {
    if (this.requestData()) {
      this.method = this.requestData()?.method || 'GET';
      this.url = this.requestData()?.url || '';
    }
  }

  @HostListener('document:click')
  closeDropdown() {
    this.isDropdownOpen = false;
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  onUrlChange(url: string): void {
    this.requestsService.updateActiveRequest({
      url,
    });
  }

  updateActiveRequest(changes: Partial<ApiRequest>): void {
    const current = this.requestsService.activeRequest();
    if (!current) return;

    this.requestsService.updateActiveRequest(changes);
  }

  onMethodChange(method: string) {
    this.method = method;
    this.requestsService.updateActiveRequest({ method: method as any });
  }

  onRequestNameChange(name: string): void {
    this.requestsService.updateActiveRequest({ name });
  }

  async sendRequest() {
    if (!this.url) return;

    const payload = {
      method: this.method,
      url: this.url,
      headers: this.requestData()?.headers || {},
      params: this.requestData()?.params || {},
      auth: this.requestData()?.auth || { type: 'none' },
      body: this.requestData()?.body || null,
    };

    try {
      //await this.requestsService.sendRequest(payload);
    } catch (error) {
      console.error('Request failed:', error);
    }
  }

  saveRequest(): void {
    const currentRequest = this.activeRequest();

    if (!currentRequest) {
      console.warn('No active request to save');
      return;
    }

    this.modalService.openModal(currentRequest);
  }

  async copyAsCurl() {
    const curlCommand = this.generateCurlCommand();

    try {
      await navigator.clipboard.writeText(curlCommand);
      this.isCopied = true;

      setTimeout(() => {
        this.isCopied = false;
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }

  generateCurlCommand(): string {
    const headers = this.requestData()?.headers || {};
    const body = this.requestData()?.body;

    let curl = `curl -X ${this.method} "${this.url}"`;

    Object.entries(headers).forEach(([key, value]) => {
      curl += ` \\\n  -H "${key}: ${value}"`;
    });

    if (body) {
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      curl += ` \\\n  -d '${bodyStr}'`;
    }

    return curl;
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
        // If it's the last request, create a new empty one before closing
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
