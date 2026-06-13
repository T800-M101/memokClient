import { Component, computed, HostListener, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RequestsService } from '../../../core/services/requests-service/requests-service';
import { ApiRequest } from '../../../core/interfaces/api-request.interface';

@Component({
  selector: 'app-request-bar',
  imports: [FormsModule],
  templateUrl: './request-bar.html',
  styleUrl: './request-bar.scss',
})
export class RequestBar {
  private requestsService = inject(RequestsService);
  request = this.requestsService.activeRequest;
  selectedIndex = signal<number>(0);
  isDropdownOpen = false;
  requestData = input<ApiRequest>();
  change = output<Partial<ApiRequest>>();
  requestName = '';
  method = 'GET';
  url = '';
  isCopied = false;

  readonly activeRequest = this.requestsService.activeRequest;
  readonly openRequests = this.requestsService.openRequests;

  readonly currentIndex = computed(() => {
    const current = this.activeRequest();
    if (!current) return 0;
    return this.openRequests().findIndex((r) => r.requestId === current.requestId);
  });

  readonly totalRequests = computed(() => this.openRequests().length);

  readonly hasPrevious = computed(() => this.currentIndex() > 0);
  readonly hasNext = computed(() => this.currentIndex() < this.totalRequests() - 1);

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
    //this.change.emit({ method });
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

  saveRequest() {
    console.log('Save request:', {
      name: this.requestName,
      method: this.method,
      url: this.url,
      headers: this.requestData()?.headers,
      params: this.requestData()?.params,
      body: this.requestData()?.body,
    });
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
      //this.tabsService.setActiveTab(this.currentIndex - 1);
    }
  }

  navigateNext(): void {
    if (this.hasNext()) {
      //this.tabsService.setActiveTab(this.currentIndex + 1);
    }
  }

  goToRequest(index: number): void {
    //this.tabsService.setActiveTab(index);
    this.isDropdownOpen = false;
  }

  closeRequest(index: number, event: Event): void {
    event.stopPropagation();
    //this.tabsService.closeTab(index);
    this.isDropdownOpen = false;
  }

  closeCurrentRequest(): void {
    if (this.totalRequests() === 1) {
      // Si es la última request, crear una nueva vacía antes de cerrar
      //this.tabsService.createNewRequest();
    }
    // this.tabsService.closeTab(this.currentIndex);
  }

  closeAllRequests(): void {
    //this.tabsService.closeAllTabs();
    this.isDropdownOpen = false;
  }
}
