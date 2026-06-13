import { Component, HostListener, inject, signal } from '@angular/core';
import { OverlayMenuService } from '../../core/services/overlay-menu-service/overlay-menu.service';
import { FormsModule } from '@angular/forms';
import { Environment, EnvironmentVariable } from '../../core/interfaces/environment-variable.interface';

@Component({
  selector: 'app-overlay-menu',
  imports: [FormsModule],
  templateUrl: './overlay-menu.html',
  styleUrl: './overlay-menu.scss',
})
export class OverlayMenu {
  private overlayMenuService = inject(OverlayMenuService);

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

  importCurl(): void {
    if (!this.curlCommand.trim()) return;

    this.overlayMenuService.importCurl();
    console.log('Importing cURL:', this.curlCommand);
    // Aquí va la lógica para parsear e importar el cURL
    this.closeImportDrawer();
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
      { key: 'port', value: '3000' }
    ],
    createdAt: new Date()
  },
  {
    id: '2',
    name: 'Production',
    variables: [
      { key: 'protocol', value: 'https' },
      { key: 'host', value: 'api.example.com' },
      { key: 'port', value: '443' },
      { key: 'JWT', value: 'prod-token-789' }
    ],
    createdAt: new Date()
  }
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
  this.environments.update(envs =>
    envs.map(env =>
      env.id === envId
        ? { ...env, variables: [...env.variables, { key: '', value: '' }] }
        : env
    )
  );
}

// Actualizar variable
updateVariable(envId: string, index: number, key: string, value: string) {
  this.environments.update(envs =>
    envs.map(env =>
      env.id === envId
        ? {
            ...env,
            variables: env.variables.map((v, i) =>
              i === index ? { key: key.trim(), value: value } : v
            )
          }
        : env
    )
  );
}

// Eliminar variable de un environment
deleteVariableFromEnvironment(envId: string, index: number) {
  if (confirm('Delete this variable?')) {
    this.environments.update(envs =>
      envs.map(env =>
        env.id === envId
          ? { ...env, variables: env.variables.filter((_, i) => i !== index) }
          : env
      )
    );
  }
}
}
