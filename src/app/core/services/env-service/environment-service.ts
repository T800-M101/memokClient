import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, tap, throwError } from 'rxjs';
import { NotificationService } from '../notifications/notification-service';
import { Environment, EnvironmentVariable } from '../../interfaces/environment-variable.interface';


@Injectable({
  providedIn: 'root',
})
export class EnvironmentService {
  private readonly http = inject(HttpClient);
  private readonly notificationService = inject(NotificationService);
  private readonly apiBase = '/api';

  // ============================================================
  // PRIVATE SIGNALS
  // ============================================================

  private readonly _environments = signal<Environment[]>([]);
  private readonly _selectedEnvironmentId = signal<string | null>(null);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  // ============================================================
  // PUBLIC READONLY SIGNALS
  // ============================================================

  readonly environments = this._environments.asReadonly();
  readonly selectedEnvironmentId = this._selectedEnvironmentId.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  // ============================================================
  // COMPUTED SIGNALS
  // ============================================================

  readonly selectedEnvironment = signal<Environment | null>(null);

  // ============================================================
  // PRIVATE UTILITIES
  // ============================================================

  private getEndpoint(path: string): string {
    return `${this.apiBase}/${path.replace(/^\//, '')}`;
  }

  // ============================================================
  // ENVIRONMENT CRUD
  // ============================================================

  /**
   * Load all environments from the backend
   */
  loadEnvironments(): void {
    this._isLoading.set(true);
    this._error.set(null);

    const url = this.getEndpoint('environments');

    this.http.get<Environment[]>(url).subscribe({
      next: (data) => {
        this._environments.set(data);
        this._isLoading.set(false);

        // If there's a selected environment, update it
        const selectedId = this._selectedEnvironmentId();
        if (selectedId) {
          const selected = data.find(env => env.id === selectedId);
          this.selectedEnvironment.set(selected || null);
        }
      },
      error: (error) => {
        console.error('Error loading environments:', error);
        this._error.set('Failed to load environments');
        this._isLoading.set(false);

        // If backend fails, try to load from localStorage as fallback
        this.loadFromLocalStorage();
      },
    });
  }

  /**
   * Create a new environment
   */
  createEnvironment(name: string, variables: EnvironmentVariable[] = []): Observable<Environment> {
    this._isLoading.set(true);
    this._error.set(null);

    const newEnvironment: Environment = {
      id: crypto.randomUUID(),
      name: name.trim(),
      variables: variables.filter(v => v.key.trim() || v.value.trim()),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const url = this.getEndpoint('environments');

    return this.http.post<Environment>(url, newEnvironment).pipe(
      tap((savedEnvironment) => {
        // Update local state
        this._environments.update(envs => [...envs, savedEnvironment]);
        this._isLoading.set(false);
        this.notificationService.success(`Environment "${savedEnvironment.name}" created successfully`);
      }),
      catchError((error) => {
        console.error('Error creating environment:', error);
        this._error.set('Failed to create environment');
        this._isLoading.set(false);
        this.notificationService.error('Failed to create environment');

        // Fallback: save to localStorage
        this.saveToLocalStorage(newEnvironment);
        this._environments.update(envs => [...envs, newEnvironment]);

        return throwError(() => error);
      })
    );
  }

  /**
   * Update an existing environment
   */
  updateEnvironment(id: string, name: string, variables: EnvironmentVariable[]): Observable<Environment> {
    this._isLoading.set(true);
    this._error.set(null);

    const currentEnv = this._environments().find(env => env.id === id);
    if (!currentEnv) {
      this._error.set('Environment not found');
      this._isLoading.set(false);
      return throwError(() => new Error('Environment not found'));
    }

    const updatedEnvironment: Environment = {
      ...currentEnv,
      name: name.trim(),
      variables: variables.filter(v => v.key.trim() || v.value.trim()),
      updatedAt: new Date(),
    };

    const url = this.getEndpoint(`environments/${id}`);

    return this.http.put<Environment>(url, updatedEnvironment).pipe(
      tap((savedEnvironment) => {
        // Update local state
        this._environments.update(envs =>
          envs.map(env => env.id === id ? savedEnvironment : env)
        );

        // Update selected if it's the current one
        if (this._selectedEnvironmentId() === id) {
          this.selectedEnvironment.set(savedEnvironment);
        }

        this._isLoading.set(false);
        this.notificationService.success(`Environment "${savedEnvironment.name}" updated successfully`);
      }),
      catchError((error) => {
        console.error('Error updating environment:', error);
        this._error.set('Failed to update environment');
        this._isLoading.set(false);
        this.notificationService.error('Failed to update environment');

        // Fallback: update localStorage
        this.updateLocalStorage(updatedEnvironment);
        this._environments.update(envs =>
          envs.map(env => env.id === id ? updatedEnvironment : env)
        );

        return throwError(() => error);
      })
    );
  }

  /**
   * Delete an environment
   */
  deleteEnvironment(id: string): Observable<void> {
    this._isLoading.set(true);
    this._error.set(null);

    const url = this.getEndpoint(`environments/${id}`);

    return this.http.delete<void>(url).pipe(
      tap(() => {
        // Update local state
        this._environments.update(envs => envs.filter(env => env.id !== id));

        // Clear selected if it was deleted
        if (this._selectedEnvironmentId() === id) {
          this._selectedEnvironmentId.set(null);
          this.selectedEnvironment.set(null);
        }

        this._isLoading.set(false);
        this.notificationService.success('Environment deleted successfully');
      }),
      catchError((error) => {
        console.error('Error deleting environment:', error);
        this._error.set('Failed to delete environment');
        this._isLoading.set(false);
        this.notificationService.error('Failed to delete environment');

        // Fallback: remove from localStorage
        this.deleteFromLocalStorage(id);
        this._environments.update(envs => envs.filter(env => env.id !== id));

        return throwError(() => error);
      })
    );
  }

  /**
   * Get a single environment by ID
   */
 getEnvironment(id: string): Observable<Environment> {
  const url = this.getEndpoint(`environments/${id}`);

  return this.http.get<Environment>(url).pipe(
    tap((environment) => {
      this._selectedEnvironmentId.set(id);
      this.selectedEnvironment.set(environment);
    }),
    catchError((error) => {
      console.error('Error fetching environment:', error);
      this._error.set('Failed to fetch environment');

      // Try to find in local state
      const localEnv = this._environments().find(env => env.id === id);
      if (localEnv) {
        this._selectedEnvironmentId.set(id);
        this.selectedEnvironment.set(localEnv);
        // ✅ Usar of() para devolver un Observable<Environment>
        return of(localEnv);
      }

      return throwError(() => error);
    })
  );
}

  // ============================================================
  // SELECTION METHODS
  // ============================================================

  /**
   * Select an environment by ID
   */
  selectEnvironment(id: string | null): void {
    this._selectedEnvironmentId.set(id);

    if (id) {
      const env = this._environments().find(e => e.id === id);
      this.selectedEnvironment.set(env || null);
    } else {
      this.selectedEnvironment.set(null);
    }
  }

  /**
   * Get variables from the selected environment
   */
  getSelectedEnvironmentVariables(): EnvironmentVariable[] {
    const env = this.selectedEnvironment();
    return env ? env.variables : [];
  }

  /**
   * Get a variable value from the selected environment
   */
  getVariableValue(key: string): string | undefined {
    const env = this.selectedEnvironment();
    if (!env) return undefined;

    const variable = env.variables.find(v => v.key === key);
    return variable?.value;
  }

  /**
   * Resolve variables in a string (replace {{variable}} with actual values)
   */
  resolveVariables(text: string, environmentId?: string): string {
    let env: Environment | null = null;

    if (environmentId) {
      env = this._environments().find(e => e.id === environmentId) || null;
    } else {
      env = this.selectedEnvironment();
    }

    if (!env) return text;

    let resolved = text;
    for (const variable of env.variables) {
      const placeholder = `{{${variable.key}}}`;
      resolved = resolved.replace(new RegExp(placeholder, 'g'), variable.value);
    }

    return resolved;
  }

  /**
   * Resolve variables in an object (recursively)
   */
  resolveObjectVariables(obj: any, environmentId?: string): any {
    if (typeof obj === 'string') {
      return this.resolveVariables(obj, environmentId);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.resolveObjectVariables(item, environmentId));
    }

    if (obj && typeof obj === 'object') {
      const resolved: any = {};
      for (const key of Object.keys(obj)) {
        resolved[key] = this.resolveObjectVariables(obj[key], environmentId);
      }
      return resolved;
    }

    return obj;
  }

  // ============================================================
  // LOCAL STORAGE FALLBACK
  // ============================================================

  /**
   * Save environments to localStorage (fallback when backend is unavailable)
   */
  private saveToLocalStorage(environment: Environment): void {
    try {
      const stored = localStorage.getItem('environments');
      let environments: Environment[] = stored ? JSON.parse(stored) : [];
      environments.push(environment);
      localStorage.setItem('environments', JSON.stringify(environments));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  /**
   * Update environment in localStorage
   */
  private updateLocalStorage(environment: Environment): void {
    try {
      const stored = localStorage.getItem('environments');
      let environments: Environment[] = stored ? JSON.parse(stored) : [];
      environments = environments.map(env =>
        env.id === environment.id ? environment : env
      );
      localStorage.setItem('environments', JSON.stringify(environments));
    } catch (error) {
      console.error('Error updating localStorage:', error);
    }
  }

  /**
   * Delete environment from localStorage
   */
  private deleteFromLocalStorage(id: string): void {
    try {
      const stored = localStorage.getItem('environments');
      let environments: Environment[] = stored ? JSON.parse(stored) : [];
      environments = environments.filter(env => env.id !== id);
      localStorage.setItem('environments', JSON.stringify(environments));
    } catch (error) {
      console.error('Error deleting from localStorage:', error);
    }
  }

  /**
   * Load environments from localStorage (fallback)
   */
  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem('environments');
      if (stored) {
        const environments: Environment[] = JSON.parse(stored);
        this._environments.set(environments);

        // Update selected if exists
        const selectedId = this._selectedEnvironmentId();
        if (selectedId) {
          const selected = environments.find(env => env.id === selectedId);
          this.selectedEnvironment.set(selected || null);
        }
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  }

  /**
   * Export environments as JSON
   */
  exportEnvironments(): string {
    const data = {
      exportedAt: new Date().toISOString(),
      environments: this._environments(),
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import environments from JSON
   */
  importEnvironments(json: string): Observable<Environment[]> {
  try {
    const data = JSON.parse(json);
    const environments: Environment[] = data.environments || data;

    // Validate environments
    if (!Array.isArray(environments)) {
      throw new Error('Invalid format: expected array of environments');
    }

    // Ensure each environment has required fields
    const validEnvironments = environments.map(env => ({
      ...env,
      id: env.id || crypto.randomUUID(),
      createdAt: env.createdAt ? new Date(env.createdAt) : new Date(),
      updatedAt: new Date(),
      variables: env.variables || [],
    }));

    // Save to backend
    const url = this.getEndpoint('environments/import');

    return this.http.post<Environment[]>(url, { environments: validEnvironments }).pipe(
      tap((imported) => {
        this._environments.set(imported);
        localStorage.setItem('environments', JSON.stringify(imported));
        this.notificationService.success(`Imported ${imported.length} environments`);
      }),
      catchError((error) => {
        console.error('Error importing environments:', error);

        // Fallback: save to localStorage
        localStorage.setItem('environments', JSON.stringify(validEnvironments));
        this._environments.set(validEnvironments);
        this.notificationService.success(`Imported ${validEnvironments.length} environments (local backup)`);

        // ✅ Usar of() en lugar de new Observable
        return of(validEnvironments);
      })
    );
  } catch (error: any) {
    this.notificationService.error(`Failed to import: ${error.message}`);
    return throwError(() => error);
  }
}

  /**
   * Export a single environment
   */
  exportEnvironment(id: string): string | null {
    const env = this._environments().find(e => e.id === id);
    if (!env) {
      this.notificationService.error('Environment not found');
      return null;
    }
    return JSON.stringify(env, null, 2);
  }

  /**
   * Duplicate an environment
   */
  duplicateEnvironment(id: string): Observable<Environment> {
    const env = this._environments().find(e => e.id === id);
    if (!env) {
      this.notificationService.error('Environment not found');
      return throwError(() => new Error('Environment not found'));
    }

    const duplicated: Environment = {
      ...env,
      id: crypto.randomUUID(),
      name: `${env.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.createEnvironment(duplicated.name, duplicated.variables);
  }

  /**
   * Get all environment names (for dropdowns, etc.)
   */
  getEnvironmentNames(): { id: string; name: string }[] {
    return this._environments().map(env => ({
      id: env.id,
      name: env.name,
    }));
  }
}
