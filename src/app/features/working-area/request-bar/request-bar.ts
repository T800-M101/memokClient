import { Component, computed, HostListener, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { lastValueFrom } from 'rxjs';

import { RequestsService } from '../../../core/services/requests-service/requests-service';
import { ModalService } from '../../../core/services/modal-service/modal-service';
import { NotificationService } from '../../../core/services/notifications/notification-service';
import { EnvironmentService } from '../../../core/services/env-service/environment-service';

import { ApiRequest } from '../../../core/interfaces/api-request.interface';

// ============================================================================
// REQUEST BAR COMPONENT
// ============================================================================

@Component({
  selector: 'app-request-bar',
  imports: [FormsModule],
  templateUrl: './request-bar.html',
  styleUrl: './request-bar.scss',
})
export class RequestBar {
  // ==========================================================================
  // DEPENDENCIES
  // ==========================================================================

  private readonly requestsService = inject(RequestsService);
  private readonly modalService = inject(ModalService);
  private readonly notificationService = inject(NotificationService);
  readonly environmentService = inject(EnvironmentService);

  // ==========================================================================
  // PUBLIC SIGNALS (from services)
  // ==========================================================================

  readonly activeRequest = this.requestsService.activeRequest;
  readonly openRequests = this.requestsService.openRequests;
  readonly isLoading = this.requestsService.isLoading;

  // ==========================================================================
  // COMPUTED VALUES - Request State
  // ==========================================================================

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

  readonly hasVariables = computed(() => {
    const currentUrl = this.url();
    if (!currentUrl) return false;
    return /\{\{.*?\}\}/.test(currentUrl);
  });

  readonly resolvedUrlPreview = computed(() => {
    const currentUrl = this.url();
    if (!currentUrl) return '';
    return this.resolveVariables(currentUrl);
  });

  // ==========================================================================
  // UI STATE
  // ==========================================================================
  isDropdownOpen = false;
  isCopied = false;

  // ==========================================================================
  // LIFECYCLE HOOKS
  // ==========================================================================

  ngOnInit() {
    this.autoSelectEnvironment();
  }

  // ==========================================================================
  // DROPDOWN MANAGEMENT
  // ==========================================================================

  /** Close dropdown when clicking outside */
  @HostListener('document:click')
  closeDropdown() {
    this.isDropdownOpen = false;
  }

  /** Toggle the request dropdown */
  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  // ==========================================================================
  // REQUEST UPDATES
  // ==========================================================================

  /** Update the request URL */
  onUrlChange(url: string): void {
    this.requestsService.updateActiveRequest({ url });
  }

  /** Update the request method */
  onMethodChange(method: string) {
    this.requestsService.updateActiveRequest({ method: method as any });
  }

  /** Update the request name */
  onRequestNameChange(name: string): void {
    this.requestsService.updateActiveRequest({ name });
  }

  // ==========================================================================
  // SEND REQUEST
  // ==========================================================================

  /**
   * Send the current request through the proxy
   * Resolves environment variables before sending
   */
  async sendRequest() {
    const current = this.activeRequest();
    if (!current?.url) return;

    this.notificationService.info('Sending request...');

    // Resolve variables in the URL
    let finalUrl = this.resolveVariables(current.url);

    // Resolve variables in params
    const resolvedParams = this.resolveObjectVariables(current.params || {}) as Record<
      string,
      string
    >;

    // Build URL with query parameters
    if (resolvedParams && Object.keys(resolvedParams).length > 0) {
      const params = new URLSearchParams(resolvedParams).toString();
      const separator = finalUrl.includes('?') ? '&' : '?';
      finalUrl = `${finalUrl}${separator}${params}`;
    }

    // Resolve variables in headers
    const resolvedHeaders = this.resolveObjectVariables(current.headers || {}) as Record<
      string,
      string
    >;

    // Prepare headers
    const headers: Record<string, string> = {};

    // Copy resolved headers
    Object.entries(resolvedHeaders).forEach(([key, value]) => {
      headers[key] = value as string;
    });

    // Add auth headers if present
    if (current.auth?.type === 'bearer' && current.auth.token) {
      const resolvedToken = this.resolveVariables(current.auth.token);
      headers['Authorization'] = `Bearer ${resolvedToken}`;
    } else if (current.auth?.type === 'basic' && current.auth.username && current.auth.password) {
      const resolvedUsername = this.resolveVariables(current.auth.username);
      const resolvedPassword = this.resolveVariables(current.auth.password);
      const credentials = btoa(`${resolvedUsername}:${resolvedPassword}`);
      headers['Authorization'] = `Basic ${credentials}`;
    }

    // Resolve body variables
    let requestBody = null;
    if (current.body) {
      if (typeof current.body === 'string') {
        try {
          const parsedBody = JSON.parse(current.body);
          const resolvedBody = this.resolveObjectVariables(parsedBody);
          requestBody = resolvedBody;
          if (!headers['Content-Type'] && !headers['content-type']) {
            headers['Content-Type'] = 'application/json';
          }
        } catch {
          requestBody = this.resolveVariables(current.body);
        }
      } else {
        requestBody = this.resolveObjectVariables(current.body);
        if (!headers['Content-Type'] && !headers['content-type']) {
          headers['Content-Type'] = 'application/json';
        }
      }
    }

    const requestPayload = {
      method: current.method,
      headers: headers,
      body: requestBody,
    };

    try {
      const response = await lastValueFrom(
        this.requestsService.sendRequest(finalUrl, requestPayload),
      );

      this.requestsService.setResponse(response);
      this.notificationService.success('Request completed successfully!');
    } catch (error: any) {
      console.error('Request failed:', error);
      this.notificationService.error(`Request failed: ${error.message || 'Unknown error'}`);
    }
  }

  // ==========================================================================
  // COPY AS CURL
  // ==========================================================================

  /**
   * Copy the current request as a cURL command
   * Resolves environment variables before generating the command
   */
  async copyAsCurl() {
    const current = this.activeRequest();
    if (!current) return;

    // Use resolved variables
    const resolvedUrl = this.resolveVariables(current.url);
    let fullUrl = resolvedUrl;

    // Resolve params
    const resolvedParams = this.resolveObjectVariables(current.params || {});
    if (resolvedParams && Object.keys(resolvedParams).length > 0) {
      const params = new URLSearchParams(resolvedParams).toString();
      const separator = fullUrl.includes('?') ? '&' : '?';
      fullUrl = `${fullUrl}${separator}${params}`;
    }

    // Resolve headers
    const resolvedHeaders = this.resolveObjectVariables(current.headers || {});
    const headers = resolvedHeaders || {};

    // Resolve body
    let resolvedBody = current.body;
    if (resolvedBody && typeof resolvedBody === 'object') {
      resolvedBody = this.resolveObjectVariables(resolvedBody);
    } else if (resolvedBody && typeof resolvedBody === 'string') {
      resolvedBody = this.resolveVariables(resolvedBody);
    }

    // Build curl command with resolved values
    let curl = `curl -X ${current.method} "${fullUrl}"`;

    // Add headers
    Object.entries(headers).forEach(([key, value]) => {
      const escapedValue = String(value).replace(/"/g, '\\"');
      curl += ` \\\n  -H "${key}: ${escapedValue}"`;
    });

    // Add body
    if (
      resolvedBody &&
      (current.method === 'POST' || current.method === 'PUT' || current.method === 'PATCH')
    ) {
      let bodyStr = typeof resolvedBody === 'string' ? resolvedBody : JSON.stringify(resolvedBody);
      bodyStr = bodyStr.replace(/'/g, "'\\''");
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

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================

  /** Navigate to the previous request */
  navigatePrevious(): void {
    if (this.hasPrevious()) {
      const prevRequest = this.openRequests()[this.currentIndex() - 1];
      if (prevRequest) {
        this.requestsService.switchToRequest(prevRequest.requestId);
      }
    }
  }

  /** Navigate to the next request */
  navigateNext(): void {
    if (this.hasNext()) {
      const nextRequest = this.openRequests()[this.currentIndex() + 1];
      if (nextRequest) {
        this.requestsService.switchToRequest(nextRequest.requestId);
      }
    }
  }

  /** Go to a specific request by index */
  goToRequest(index: number): void {
    const request = this.openRequests()[index];
    if (request) {
      this.requestsService.switchToRequest(request.requestId);
    }
    this.isDropdownOpen = false;
  }

  // ==========================================================================
  // CLOSE REQUESTS
  // ==========================================================================

  /** Close a specific request by index */
  closeRequest(index: number, event: Event): void {
    event.stopPropagation();
    const request = this.openRequests()[index];
    if (request) {
      this.requestsService.closeRequest(request.requestId);
    }
    this.isDropdownOpen = false;
  }

  /** Close the current request */
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

  /** Close all open requests */
  closeAllRequests(): void {
    this.requestsService.closeAllRequests();
    this.isDropdownOpen = false;
  }

  // ==========================================================================
  // SAVE REQUEST
  // ==========================================================================

  /** Save the current request */
  saveRequest(): void {
    const currentRequest = this.activeRequest();

    if (!currentRequest) {
      console.warn('No active request to save');
      return;
    }

    // Check if it's a new request (temporary ID or not saved to backend)
    const isNewRequest = this.isTemporaryRequest(currentRequest);

    if (isNewRequest) {
      this.openModalForNewRequest(currentRequest);
    } else {
      this.updateExistingRequest(currentRequest);
    }
  }

  /** Check if a request is temporary (not yet saved) */
  private isTemporaryRequest(request: ApiRequest): boolean {
    const collections = this.requestsService.collections();
    const isInAnyCollection = collections.some((collection) =>
      collection.requests.some((req) => req.requestId === request.requestId),
    );

    return !isInAnyCollection || request.requestId.startsWith('temp-');
  }

  /** Open modal for a new request */
  private openModalForNewRequest(request: ApiRequest): void {
    this.modalService.openModal(request);
  }

  /** Update an existing request */
  private updateExistingRequest(request: ApiRequest): void {
    this.requestsService.updateRequest(request.requestId, request).subscribe({
      next: () => {
        this.notificationService.show('Request updated successfully');
      },
      error: (error) => {
        console.error('Error updating request:', error);
        this.notificationService.error('Error updating request');
      },
    });
  }

  // ==========================================================================
  // ENVIRONMENT VARIABLE RESOLUTION
  // ==========================================================================

  /**
   * Auto-select the first available environment if none is selected
   */
  private autoSelectEnvironment(): void {
    const environments = this.environmentService.environments();
    const selected = this.environmentService.selectedEnvironment();

    // Only auto-select if there's no environment selected
    if (!selected && environments.length > 0) {
      const firstEnv = environments[0];
      this.environmentService.selectEnvironment(firstEnv.id);
      console.log('✅ Auto-selected environment:', firstEnv.name);
    } else if (environments.length === 0) {
      console.warn('⚠️ No environments found. Please create one first.');
    } else {
      console.log('✅ Environment already selected:', selected?.name);
    }
  }

  /**
   * Resolve environment variables in a string
   * Replaces {{variable_name}} with the actual value from the selected environment
   */
  private resolveVariables(text: string): string {
    if (!text) return text;

    const selectedEnv = this.environmentService.selectedEnvironment();

    if (!selectedEnv) {
      console.warn('⚠️ No environment selected! Variables will not be resolved.');
      return text;
    }

    let resolved = text;

    // Replace all {{variable}} placeholders
    for (const variable of selectedEnv.variables) {
      const placeholder = `{{${variable.key}}}`;
      resolved = resolved.replace(new RegExp(placeholder, 'g'), variable.value);
    }

    return resolved;
  }

  /**
   * Resolve variables in an object recursively
   */
  private resolveObjectVariables(obj: any): any {
    if (typeof obj === 'string') {
      return this.resolveVariables(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.resolveObjectVariables(item));
    }

    if (obj && typeof obj === 'object') {
      const resolved: any = {};
      for (const key of Object.keys(obj)) {
        const value = obj[key];
        if (typeof value === 'string') {
          resolved[key] = this.resolveVariables(value);
        } else if (Array.isArray(value)) {
          resolved[key] = value.map((item) => this.resolveObjectVariables(item));
        } else if (value && typeof value === 'object') {
          resolved[key] = this.resolveObjectVariables(value);
        } else {
          resolved[key] = value;
        }
      }
      return resolved;
    }

    return obj;
  }

  // ==========================================================================
  // ENVIRONMENT SELECTOR
  // ==========================================================================

  /** All available environments */
  readonly environments = this.environmentService.environments;

  /** Currently selected environment */
  readonly selectedEnvironment = this.environmentService.selectedEnvironment;

  /** Whether the environment selector dropdown is open */
  isEnvironmentSelectorOpen = false;

  /**
   * Toggle the environment selector dropdown
   */
  toggleEnvironmentSelector(): void {
    this.isEnvironmentSelectorOpen = !this.isEnvironmentSelectorOpen;
  }

  /**
   * Select an environment by ID
   */
  selectEnvironment(envId: string): void {
    this.environmentService.selectEnvironment(envId);
    this.isEnvironmentSelectorOpen = false;
    this.notificationService.info(`Environment switched to: ${this.selectedEnvironment()?.name}`);
  }

  /**
   * Clear the selected environment
   */
  clearEnvironment(): void {
    this.environmentService.selectEnvironment(null);
    this.isEnvironmentSelectorOpen = false;
    this.notificationService.info('Environment cleared');
  }
}
