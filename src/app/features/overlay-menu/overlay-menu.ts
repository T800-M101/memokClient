import { Component, HostListener, inject, signal, OnInit } from '@angular/core';
import { OverlayMenuService } from '../../core/services/overlay-menu-service/overlay-menu.service';
import { FormsModule } from '@angular/forms';
import {
  Environment,
  EnvironmentVariable,
} from '../../core/interfaces/environment-variable.interface';
import { ApiRequest } from '../../core/interfaces/api-request.interface';
import { RequestsService } from '../../core/services/requests-service/requests-service';
import { NotificationService } from '../../core/services/notifications/notification-service';
import { EnvironmentService } from '../../core/services/env-service/environment-service';

@Component({
  selector: 'app-overlay-menu',
  imports: [FormsModule],
  templateUrl: './overlay-menu.html',
  styleUrl: './overlay-menu.scss',
})
export class OverlayMenu implements OnInit {
  private overlayMenuService = inject(OverlayMenuService);
  private readonly requestsService = inject(RequestsService);
  private readonly notificationService = inject(NotificationService);
  private readonly environmentService = inject(EnvironmentService);

  // ============================================
  // ENVIRONMENTS - Usar las señales del servicio
  // ============================================

  // ✅ Usar las señales del EnvironmentService
  environments = this.environmentService.environments;
  selectedEnvId = this.environmentService.selectedEnvironmentId;
  isLoading = this.environmentService.isLoading;

  // ✅ Estado de expansión local (solo UI)
  expandedEnvId = signal<string | null>(null);

  // ✅ Para saber si estamos editando o creando
  isEditingEnvironment = signal(false);
  private editingEnvId = signal<string | null>(null);

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

  // ✅ Variables para el formulario de creación/edición de environment
  environmentName = signal('');
  environmentVariables = signal<EnvironmentVariable[]>([
    { key: '', value: '' }
  ]);

  // ============================================
  // LIFECYCLE
  // ============================================

  ngOnInit(): void {
    // ✅ Cargar environments al iniciar
    this.environmentService.loadEnvironments();
  }

  // ============================================
  // MENU METHODS
  // ============================================

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

  // ============================================
  // IMPORT CURL
  // ============================================

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

  async importCurl(): Promise<void> {
    if (!this.curlCommand.trim()) return;

    try {
      const parsedRequest = await this.parseCurlCommand(this.curlCommand);
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

      this.requestsService.setActiveRequest('', newRequest);
      this.notificationService.success('cURL command imported successfully!');
      this.closeImportDrawer();
    } catch (error: any) {
      console.error('Error parsing cURL:', error);
      this.notificationService.error(`Failed to parse cURL: ${error.message}`);
    }
  }

  private async parseCurlCommand(curlString: string): Promise<Partial<ApiRequest>> {
    const cleanCurl = curlString.replace(/\\\n/g, ' ').replace(/\s+/g, ' ').trim();

    let method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET';
    const methodMatch = cleanCurl.match(/-X\s+(\w+)/i);
    if (methodMatch) {
      const foundMethod = methodMatch[1].toUpperCase();
      if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(foundMethod)) {
        method = foundMethod as any;
      }
    }

    let url = '';
    const urlMatch = cleanCurl.match(/(?:curl\s+)?(?:-X\s+\w+\s+)?['"]?((?:https?:\/\/)[^'"\s]+)/i);
    if (urlMatch) {
      url = urlMatch[1];
    }

    const headers: Record<string, string> = {};
    const headerRegex = /-H\s+['"]([^'"]+)['"]/g;
    let headerMatch;
    while ((headerMatch = headerRegex.exec(cleanCurl)) !== null) {
      const [key, value] = headerMatch[1].split(/:\s*/, 2);
      if (key && value) {
        headers[key] = value;
      }
    }

    let body = null;
    let bodyMatch = cleanCurl.match(/(?:-d|--data)\s+'([^']+)'/);
    if (!bodyMatch) {
      bodyMatch = cleanCurl.match(/(?:-d|--data)\s+"([^"]+)"/);
    }
    if (!bodyMatch) {
      bodyMatch = cleanCurl.match(/(?:-d|--data)\s+([^\s]+)/);
    }
    if (bodyMatch) {
      let bodyStr = bodyMatch[1];
      try {
        bodyStr = bodyStr.replace(/\\"/g, '"');
        body = JSON.parse(bodyStr);
      } catch {
        body = bodyStr;
      }
    }

    const params: Record<string, string> = {};
    const urlParts = url.split('?');
    if (urlParts.length > 1) {
      const searchParams = new URLSearchParams(urlParts[1]);
      searchParams.forEach((value, key) => {
        params[key] = value;
      });
      url = urlParts[0];
    }

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

    let name = this.generateRequestName(url, method);

    return { name, method, url, params, headers, auth, body };
  }

  private generateRequestName(url: string, method: string): string {
    if (!url) return `${method} Request`;
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter((p) => p);
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart) {
        const name = lastPart.replace(/[-_]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
        return `${method} ${name}`;
      }
      return `${method} ${urlObj.hostname}`;
    } catch {
      return `${method} Request`;
    }
  }

  // ============================================
  // ENVIRONMENTS METHODS
  // ============================================

  toggleEnvironmentsDrawer(): void {
    if (this.isEnvironmentsDrawerOpen()) {
      this.closeEnvironmentsDrawer();
    } else {
      this.openEnvironmentsDrawer();
    }
  }

  openEnvironmentsDrawer(): void {
    this.resetEnvironmentForm();
    this.isEnvironmentsDrawerClosing.set(false);
    this.isEnvironmentsDrawerOpen.set(true);
  }

  closeEnvironmentsDrawer(): void {
    this.isEnvironmentsDrawerClosing.set(true);
    setTimeout(() => {
      this.isEnvironmentsDrawerOpen.set(false);
      this.isEnvironmentsDrawerClosing.set(false);
      this.resetEnvironmentForm();
    }, 250);
  }

  private resetEnvironmentForm(): void {
    this.environmentName.set('');
    this.environmentVariables.set([{ key: '', value: '' }]);
    this.isEditingEnvironment.set(false);
    this.editingEnvId.set(null);
  }

  addVariable(): void {
    this.environmentVariables.update((vars) => [...vars, { key: '', value: '' }]);
  }

  removeVariable(index: number): void {
    const currentVars = this.environmentVariables();
    if (currentVars.length <= 1) {
      this.notificationService.warning('Environment needs at least one variable');
      return;
    }
    this.environmentVariables.update((vars) => vars.filter((_, i) => i !== index));
  }

  // ✅ Guardar environment usando el servicio
  saveEnvironments(): void {
    const name = this.environmentName().trim();
    const variables = this.environmentVariables().filter(
      (v) => v.key.trim() || v.value.trim()
    );

    if (!name) {
      this.notificationService.error('Environment name is required');
      return;
    }

    if (variables.length === 0 || !variables.some(v => v.key.trim() && v.value.trim())) {
      this.notificationService.error('At least one valid variable is required');
      return;
    }

    if (this.isEditingEnvironment() && this.editingEnvId()) {
      // ✅ Editar environment existente usando el servicio
      this.environmentService.updateEnvironment(
        this.editingEnvId()!,
        name,
        variables
      ).subscribe({
        next: (updated) => {
          this.closeEnvironmentsDrawer();
        },
        error: (error) => {
          console.error('Error updating environment:', error);
        }
      });
    } else {
      // Crear nuevo environment usando el servicio
      this.environmentService.createEnvironment(name, variables).subscribe({
        next: (created) => {
          this.closeEnvironmentsDrawer();
        },
        error: (error) => {
          console.error('Error creating environment:', error);
        }
      });
    }
  }

  // ✅ Editar environment existente
  editEnvironment(envId: string): void {
    const env = this.environments().find((e) => e.id === envId);
    if (!env) return;

    this.isEditingEnvironment.set(true);
    this.editingEnvId.set(envId);
    this.environmentName.set(env.name);
    this.environmentVariables.set(
      env.variables.length > 0 ? env.variables : [{ key: '', value: '' }]
    );

    this.isEnvironmentsDrawerClosing.set(false);
    this.isEnvironmentsDrawerOpen.set(true);
  }

  // ✅ Eliminar environment usando el servicio
  deleteEnvironment(envId: string): void {
    if (confirm('Delete this environment?')) {
      this.environmentService.deleteEnvironment(envId).subscribe({
        next: () => {
          this.notificationService.success('Environment deleted');
        },
        error: (error) => {
          console.error('Error deleting environment:', error);
          this.notificationService.error('Failed to delete environment');
        }
      });
    }
  }

  // ============================================
  // ENVIRONMENT LIST METHODS
  // ============================================

  selectEnvironment(id: string): void {
    this.environmentService.selectEnvironment(id);
  }

  toggleEnvironmentExpand(envId: string): void {
    if (this.expandedEnvId() === envId) {
      this.expandedEnvId.set(null);
    } else {
      this.expandedEnvId.set(envId);
    }
  }

  closeEnvironmentExpand(): void {
    this.expandedEnvId.set(null);
  }

  addVariableToEnvironment(envId: string): void {
    const env = this.environments().find(e => e.id === envId);
    if (!env) return;

    const updatedVariables = [...env.variables, { key: '', value: '' }];

    this.environmentService.updateEnvironment(
      envId,
      env.name,
      updatedVariables
    ).subscribe({
      next: () => {
        this.notificationService.success('Variable added');
      },
      error: (error) => {
        console.error('Error adding variable:', error);
        this.notificationService.error('Failed to add variable');
      }
    });
  }

  updateVariable(envId: string, index: number, key: string, value: string): void {
    const env = this.environments().find(e => e.id === envId);
    if (!env) return;

    const updatedVariables = env.variables.map((v, i) =>
      i === index ? { key: key.trim(), value: value } : v
    );

    this.environmentService.updateEnvironment(
      envId,
      env.name,
      updatedVariables
    ).subscribe({
      error: (error) => {
        console.error('Error updating variable:', error);
        this.notificationService.error('Failed to update variable');
      }
    });
  }

  deleteVariableFromEnvironment(envId: string, index: number): void {
    if (!confirm('Delete this variable?')) return;

    const env = this.environments().find(e => e.id === envId);
    if (!env) return;

    const updatedVariables = env.variables.filter((_, i) => i !== index);

    this.environmentService.updateEnvironment(
      envId,
      env.name,
      updatedVariables
    ).subscribe({
      next: () => {
        this.notificationService.success('Variable deleted');
      },
      error: (error) => {
        console.error('Error deleting variable:', error);
        this.notificationService.error('Failed to delete variable');
      }
    });
  }
}
