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
  //private tabsService = inject(TabsService);

  selectedIndex = signal<number>(0);
  isDropdownOpen = false;

  // Computed values
  currentRequest = computed(() => this.mockTabs()[this.selectedIndex()]);

  get currentIndex(): number {
    return 0;
  }

  get totalRequests(): number {
    return 0;
  }

  // Cerrar dropdown al hacer click fuera
  @HostListener('document:click')
  closeDropdown() {
    this.isDropdownOpen = false;
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  mockTabs = signal<any[]>([
    {
      requestId: 'req-1',
      name: 'Get Users',
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/users',
    },
    {
      requestId: 'req-2',
      name: 'Create Post',
      method: 'POST',
      url: 'https://jsonplaceholder.typicode.com/posts',
    },
    {
      requestId: 'req-3',
      name: 'Update User',
      method: 'PUT',
      url: 'https://jsonplaceholder.typicode.com/users/1',
    },
    {
      requestId: 'req-4',
      name: 'Delete Product',
      method: 'DELETE',
      url: 'https://fakestoreapi.com/products/1',
    },
    {
      requestId: 'req-5',
      name: 'Get Products',
      method: 'GET',
      url: 'https://fakestoreapi.com/products',
    },
    {
      requestId: 'req-6',
      name: 'Login Request',
      method: 'POST',
      url: 'https://reqres.in/api/login',
    },
  ]);
  private requestsService = inject(RequestsService);

  requestData = input<ApiRequest>();
  change = output<Partial<ApiRequest>>();
  requestName = 'Untitled Request';
  method = 'GET';
  url = '';
  isCopied = false;

  ngOnInit() {
    if (this.requestData()) {
      this.method = this.requestData()?.method || 'GET';
      this.url = this.requestData()?.url || '';
    }
  }

  onMethodChange(method: string) {
    this.method = method;
    //this.change.emit({ method });
  }

  onUrlChange(url: string) {
    this.url = url;
    this.change.emit({ url });
  }

  onRequestNameChange(name: string) {
    this.requestName = name;
    this.change.emit({ name });
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

  hasPrevious(): boolean {
    return this.currentIndex > 0;
  }

  hasNext(): boolean {
    return this.currentIndex < this.totalRequests - 1;
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
    if (this.totalRequests === 1) {
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
