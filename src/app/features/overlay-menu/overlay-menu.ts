import { Component, HostListener, inject, signal } from '@angular/core';
import { OverlayMenuService } from '../../core/services/overlay-menu-service/overlay-menu.service';
import { FormsModule } from '@angular/forms';
import {
  Environment,
  EnvironmentVariable,
} from '../../core/interfaces/environment-variable.interface';
import { ApiRequest } from '../../core/interfaces/api-request.interface';
import { RequestsService } from '../../core/services/requests-service/requests-service';
import { NotificationService } from '../../core/services/notifications/notification-service';

@Component({
  selector: 'app-overlay-menu',
  imports: [FormsModule],
  templateUrl: './overlay-menu.html',
  styleUrl: './overlay-menu.scss',
})
export class OverlayMenu {
  private overlayMenuService = inject(OverlayMenuService);
  private readonly requestsService = inject(RequestsService);
  private readonly notificationService = inject(NotificationService);

  // Resize functionality
  private readonly DEFAULT_WIDTH = 280;
  private readonly MIN_WIDTH = 300;
  private readonly MAX_WIDTH = 500;

  menuWidth = signal(this.DEFAULT_WIDTH);
  isResizing = false;
  private startX = 0;
  private startWidth = 0;

  isImportDrawerOpen = signal(false);
  isImportDrawerClosing = signal(false);
  curlCommand = '';

  // Environments Drawer
  isEnvironmentsDrawerOpen = signal(false);
  isEnvironmentsDrawerClosing = signal(false);
  environmentName = '';
  variables = signal<EnvironmentVariable[]>([
    { key: 'protocol', value: '' },
    { key: 'host', value: '' },
    { key: 'port', value: '' },
    { key: 'basePath', value: '' },
    { key: 'local', value: '' },
    { key: 'JWT', value: '' },
  ]);

  startResize(event: MouseEvent): void {
    this.isResizing = true;
    this.startX = event.clientX;
    this.startWidth = this.menuWidth();
    event.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.isResizing) return;

    const deltaX = event.clientX - this.startX;
    let newWidth = this.startWidth + deltaX;

    // Apply limits
    newWidth = Math.max(this.MIN_WIDTH, Math.min(this.MAX_WIDTH, newWidth));
    this.menuWidth.set(newWidth);
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.isResizing = false;
  }

  get isMenuOpen(): boolean {
    return this.overlayMenuService.isMenuOpen();
  }

  get isClosing(): boolean {
    return this.overlayMenuService.isClosing();
  }

  closeMenu(): void {
    this.overlayMenuService.closeMenu();
  }

  toggleImportDrawer(): void {
    if (this.isImportDrawerOpen()) {
      this.closeImportDrawer();
    } else {
      this.openImportDrawer();
    }
  }

  openImportDrawer(): void {
    this.isImportDrawerClosing.set(false);
    this.isImportDrawerOpen.set(true);
  }

  closeImportDrawer(): void {
    this.isImportDrawerClosing.set(true);

    setTimeout(() => {
      this.isImportDrawerOpen.set(false);
      this.isImportDrawerClosing.set(false);
      this.curlCommand = '';
    }, 250);
  }

  /**
   * Imports a cURL command and creates a new request
   */
  async importCurl(): Promise<void> {
    if (!this.curlCommand.trim()) return;

    // this.isImporting.set(true);
    console.log('Importing cURL:', this.curlCommand);

    try {
      // Parse the curl command
      const parsedRequest = await this.parseCurlCommand(this.curlCommand);

      // Create a new request from parsed data
      const newRequest: ApiRequest = {
        requestId: crypto.randomUUID(),
        name: parsedRequest.name || 'Imported Request',
        method: (parsedRequest.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH') || 'GET',
        url: parsedRequest.url || '',
        params: parsedRequest.params || {},
        headers: parsedRequest.headers || {},
        auth: parsedRequest.auth || { type: 'none' },
        body: parsedRequest.body || null,
      };

      // Add to open requests and activate it
      this.requestsService.setActiveRequest('', newRequest);

      this.notificationService.success('cURL command imported successfully!');
      this.closeImportDrawer();
    } catch (error: any) {
      console.error('Error parsing cURL:', error);
      this.notificationService.error(`Failed to parse cURL: ${error.message}`);
    } finally {
      //this.isImporting.set(false);
    }
  }

  /**
   * Parses a cURL command string into a request object
   */
  private async parseCurlCommand(curlString: string): Promise<Partial<ApiRequest>> {
    // Clean the curl command
    const cleanCurl = curlString.replace(/\\\n/g, ' ').replace(/\s+/g, ' ').trim();

    // Extract method
    let method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET';
    const methodMatch = cleanCurl.match(/-X\s+(\w+)/i);
    if (methodMatch) {
      const foundMethod = methodMatch[1].toUpperCase();
      if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(foundMethod)) {
        method = foundMethod as any;
      }
    }

    // Extract URL
    let url = '';
    // Match URL with quotes or without
    const urlMatch = cleanCurl.match(/(?:curl\s+)?(?:-X\s+\w+\s+)?['"]?((?:https?:\/\/)[^'"\s]+)/i);
    if (urlMatch) {
      url = urlMatch[1];
    }

    // Extract headers
    const headers: Record<string, string> = {};
    const headerRegex = /-H\s+['"]([^'"]+)['"]/g;
    let headerMatch;
    while ((headerMatch = headerRegex.exec(cleanCurl)) !== null) {
      const [key, value] = headerMatch[1].split(/:\s*/, 2);
      if (key && value) {
        headers[key] = value;
      }
    }

    // ✅ Extract body - handle different quote types
    let body = null;

    // Try to match body with single quotes
    let bodyMatch = cleanCurl.match(/(?:-d|--data)\s+'([^']+)'/);

    // If not found, try with double quotes
    if (!bodyMatch) {
      bodyMatch = cleanCurl.match(/(?:-d|--data)\s+"([^"]+)"/);
    }

    // If still not found, try without quotes
    if (!bodyMatch) {
      bodyMatch = cleanCurl.match(/(?:-d|--data)\s+([^\s]+)/);
    }

    if (bodyMatch) {
      let bodyStr = bodyMatch[1];

      // Try to parse as JSON
      try {
        // Unescape if needed
        bodyStr = bodyStr.replace(/\\"/g, '"');
        body = JSON.parse(bodyStr);
      } catch {
        // Not valid JSON, keep as string
        body = bodyStr;
      }
    }

    // Extract params from URL
    const params: Record<string, string> = {};
    const urlParts = url.split('?');
    if (urlParts.length > 1) {
      const searchParams = new URLSearchParams(urlParts[1]);
      searchParams.forEach((value, key) => {
        params[key] = value;
      });
      url = urlParts[0];
    }

    // Extract auth
    let auth: {
      type: 'none' | 'bearer' | 'basic';
      token?: string;
      username?: string;
      password?: string;
    } = { type: 'none' };

    if (headers['Authorization']) {
      const authHeader = headers['Authorization'];
      if (authHeader.startsWith('Bearer ')) {
        auth = { type: 'bearer', token: authHeader.substring(7) };
        delete headers['Authorization'];
      } else if (authHeader.startsWith('Basic ')) {
        try {
          const credentials = atob(authHeader.substring(6));
          const [username, password] = credentials.split(':');
          auth = { type: 'basic', username, password };
          delete headers['Authorization'];
        } catch (e) {
          console.warn('Failed to decode Basic auth');
        }
      }
    }

    // Generate a name from the URL
    let name = this.generateRequestName(url, method);

    console.log('Parsed cURL result:', { method, url, headers, body, params, auth, name });

    return {
      name,
      method,
      url,
      params,
      headers,
      auth,
      body,
    };
  }

  /**
   * Generates a readable name from the URL
   */
  private generateRequestName(url: string, method: string): string {
    if (!url) return `${method} Request`;

    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter((p) => p);
      const lastPart = pathParts[pathParts.length - 1];

      if (lastPart) {
        // Convert kebab-case or snake_case to readable name
        const name = lastPart.replace(/[-_]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
        return `${method} ${name}`;
      }
      return `${method} ${urlObj.hostname}`;
    } catch {
      return `${method} Request`;
    }
  }

  // Environments methods
  toggleEnvironmentsDrawer(): void {
    if (this.isEnvironmentsDrawerOpen()) {
      this.closeEnvironmentsDrawer();
    } else {
      this.openEnvironmentsDrawer();
    }
  }

  openEnvironmentsDrawer(): void {
    this.isEnvironmentsDrawerClosing.set(false);
    this.isEnvironmentsDrawerOpen.set(true);
  }

  closeEnvironmentsDrawer(): void {
    this.isEnvironmentsDrawerClosing.set(true);

    setTimeout(() => {
      this.isEnvironmentsDrawerOpen.set(false);
      this.isEnvironmentsDrawerClosing.set(false);
    }, 250);
  }

  addVariable(): void {
    this.variables.update((vars) => [...vars, { key: '', value: '' }]);
  }

  removeVariable(index: number): void {
    this.variables.update((vars) => vars.filter((_, i) => i !== index));
  }

  saveEnvironments(): void {
    const envData = {
      name: this.environmentName,
      variables: this.variables().filter((v) => v.key.trim() || v.value.trim()),
    };
    this.closeEnvironmentsDrawer();
  }

  environments = signal<Environment[]>([
    {
      id: '1',
      name: 'Development',
      variables: [
        { key: 'protocol', value: 'http' },
        { key: 'host', value: 'localhost' },
        { key: 'port', value: '3000' },
      ],
      createdAt: new Date(),
    },
    {
      id: '2',
      name: 'Production',
      variables: [
        { key: 'protocol', value: 'https' },
        { key: 'host', value: 'api.example.com' },
        { key: 'port', value: '443' },
        { key: 'JWT', value: 'prod-token-789' },
      ],
      createdAt: new Date(),
    },
  ]);

  selectedEnvId = signal<string | null>('1');
  expandedEnvId = signal<string | null>(null);

  selectEnvironment(id: string) {
    this.selectedEnvId.set(id);
    console.log('Selected environment:', id);
  }

  // Toggle para expandir/colapsar
  toggleEnvironmentExpand(envId: string) {
    if (this.expandedEnvId() === envId) {
      this.expandedEnvId.set(null);
    } else {
      this.expandedEnvId.set(envId);
    }
  }

  // Cerrar panel expandido
  closeEnvironmentExpand() {
    this.expandedEnvId.set(null);
  }

  // Añadir variable a un environment específico
  addVariableToEnvironment(envId: string) {
    this.environments.update((envs) =>
      envs.map((env) =>
        env.id === envId ? { ...env, variables: [...env.variables, { key: '', value: '' }] } : env,
      ),
    );
  }

  // Actualizar variable
  updateVariable(envId: string, index: number, key: string, value: string) {
    this.environments.update((envs) =>
      envs.map((env) =>
        env.id === envId
          ? {
              ...env,
              variables: env.variables.map((v, i) =>
                i === index ? { key: key.trim(), value: value } : v,
              ),
            }
          : env,
      ),
    );
  }

  // Eliminar variable de un environment
  deleteVariableFromEnvironment(envId: string, index: number) {
    if (confirm('Delete this variable?')) {
      this.environments.update((envs) =>
        envs.map((env) =>
          env.id === envId
            ? { ...env, variables: env.variables.filter((_, i) => i !== index) }
            : env,
        ),
      );
    }
  }
}
