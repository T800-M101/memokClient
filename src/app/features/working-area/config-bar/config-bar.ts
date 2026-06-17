import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ApiRequest } from '../../../core/interfaces/api-request.interface';
import { RequestsService } from '../../../core/services/requests-service/requests-service';

// ============================================================================
// CONFIG BAR COMPONENT
// ============================================================================

@Component({
  selector: 'app-config-bar',
  imports: [ReactiveFormsModule],
  templateUrl: './config-bar.html',
  styleUrl: './config-bar.scss',
})
export class ConfigBar {
  // ==========================================================================
  // DEPENDENCIES & PROPERTIES
  // ==========================================================================

  private fb = inject(FormBuilder);
  private requestsService = inject(RequestsService);
  readonly activeRequest = this.requestsService.activeRequest;

  requestData = input<ApiRequest | null>();
  isCollapsed = signal(false);
  activeTab = signal<'params' | 'headers' | 'auth' | 'body'>('params');

  private isUpdating = false;

  // ==========================================================================
  // AUTH STATE
  // ==========================================================================

  authType = signal<'none' | 'bearer' | 'basic'>('none');
  showBearerToken = signal(false);
  bearerToken = signal('');
  basicUsername = signal('');
  basicPassword = signal('');

  // ==========================================================================
  // FORM GROUP
  // ==========================================================================

  configForm: FormGroup = this.fb.group({
    params: this.fb.array([]),
    headers: this.fb.array([]),
    auth: this.fb.group({
      type: ['none'],
      token: [''],
      username: [''],
      password: [''],
    }),
    body: [''],
  });

  // ==========================================================================
  // CONSTRUCTOR & LIFECYCLE
  // ==========================================================================

  constructor() {
    effect(() => {
      const active = this.activeRequest();
      if (!active) return;
      this.loadRequestData(active);
    });

    this.paramsArray.valueChanges.subscribe(() => {
      console.log('ENNLOS PARMAS', this.isUpdating);
      if (!this.isUpdating) {
        this.emitParamsChange();
      }
    });

    this.headersArray.valueChanges.subscribe(() => {
      if (!this.isUpdating) {
        this.emitHeadersChange();
      }
    });
  }

  // ==========================================================================
  // FORM HELPERS (GETTERS)
  // ==========================================================================

  get paramsArray(): FormArray {
    return this.configForm.get('params') as FormArray;
  }

  get headersArray(): FormArray {
    return this.configForm.get('headers') as FormArray;
  }

  // ==========================================================================
  // LOAD REQUEST DATA
  // ==========================================================================

  private loadRequestData(request: ApiRequest): void {
    this.isUpdating = true;

    // ---------- PARAMS ----------
    this.paramsArray.clear({ emitEvent: false });

    const params = request.params ?? {};

    console.log('Loading params:', params);

    const paramEntries = Object.entries(params);

    if (paramEntries.length > 0) {
      for (const [key, value] of paramEntries) {
        this.paramsArray.push(
          this.fb.group({
            key: [key],
            value: [String(value)],
            description: [''],
          }),
          { emitEvent: false },
        );
      }
    } else {
      this.paramsArray.push(
        this.fb.group({
          key: [''],
          value: [''],
          description: [''],
        }),
        { emitEvent: false },
      );
    }

    // ---------- HEADERS ----------
    this.headersArray.clear({ emitEvent: false });

    const headers = request.headers ?? {};
    const headerEntries = Object.entries(headers).filter(([key]) => key !== 'Authorization');

    if (headerEntries.length > 0) {
      for (const [key, value] of headerEntries) {
        this.headersArray.push(
          this.fb.group({
            key: [key],
            value: [String(value)],
          }),
          { emitEvent: false },
        );
      }
    } else {
      this.headersArray.push(
        this.fb.group({
          key: [''],
          value: [''],
        }),
        { emitEvent: false },
      );
    }

    // ---------- AUTH ----------
    const auth = request.auth;
    this.authType.set(auth?.type || 'none');
    this.bearerToken.set(auth?.token || '');
    this.basicUsername.set(auth?.username || '');
    this.basicPassword.set(auth?.password || '');

    // ---------- BODY ----------
    this.configForm.patchValue(
      {
        body: request.body || '',
      },
      { emitEvent: false },
    );

    this.isUpdating = false;
  }

  // ==========================================================================
  // FORM GROUP CREATORS
  // ==========================================================================

  private createParamGroup(key = '', value = '', description = ''): FormGroup {
    return this.fb.group({
      key: [key],
      value: [value],
      description: [description],
    });
  }

  private createHeaderGroup(key = '', value = ''): FormGroup {
    return this.fb.group({
      key: [key],
      value: [value],
    });
  }

  // ==========================================================================
  // AUTH METHODS
  // ==========================================================================

  onAuthTypeChange(type: 'none' | 'bearer' | 'basic') {
    this.authType.set(type);

    this.configForm.patchValue({
      auth: {
        ...this.configForm.value.auth,
        type,
      },
    });
  }

  toggleBearerVisibility() {
    this.showBearerToken.update((v) => !v);
  }

  onBearerTokenChange(token: string) {
    this.bearerToken.set(token);

    this.configForm.patchValue({
      auth: {
        ...this.configForm.value.auth,
        token,
      },
    });
  }

  onBasicUsernameChange(username: string) {
    this.basicUsername.set(username);

    this.configForm.patchValue({
      auth: {
        ...this.configForm.value.auth,
        username,
      },
    });
  }

  onBasicPasswordChange(password: string) {
    this.basicPassword.set(password);

    this.configForm.patchValue({
      auth: {
        ...this.configForm.value.auth,
        password,
      },
    });
  }

  private getAuthorizationHeader(): string | null {
    const type = this.authType();

    if (type === 'bearer' && this.bearerToken()) {
      return `Bearer ${this.bearerToken()}`;
    }

    if (type === 'basic' && this.basicUsername() && this.basicPassword()) {
      const credentials = `${this.basicUsername()}:${this.basicPassword()}`;
      const encoded = btoa(credentials);
      return `Basic ${encoded}`;
    }

    return null;
  }

  // ==========================================================================
  // BODY METHODS
  // ==========================================================================

  // onBodyInput(event: Event) {
  //   const value = (event.target as HTMLTextAreaElement).value;
  //   this.configForm.patchValue({
  //     body: value,
  //   });
  // }
  // ==========================================================================
// BODY METHODS - JSON EDITOR
// ==========================================================================

onBodyInput(event: Event) {
  const value = (event.target as HTMLTextAreaElement).value;
  this.configForm.patchValue({
    body: value,
  });

  // Update the service with the new body value
  if (!this.isUpdating) {
    this.requestsService.updateActiveRequest({ body: value });
  }
}

formatJson(): void {
  const currentBody = this.configForm.get('body')?.value;

  if (!currentBody || currentBody.trim() === '') {
    return;
  }

  try {
    const parsed = JSON.parse(currentBody);
    const formatted = JSON.stringify(parsed, null, 2);
    this.configForm.patchValue({ body: formatted }, { emitEvent: true });

    // Update the service
    this.requestsService.updateActiveRequest({ body: formatted });
  } catch (error) {
    console.warn('Invalid JSON, cannot format');
  }
}

clearJson(): void {
  this.configForm.patchValue({ body: '' }, { emitEvent: true });
  this.requestsService.updateActiveRequest({ body: '' });
}

isValidJson(): boolean {
  const content = this.configForm.get('body')?.value?.trim() ?? '';

  if (!content) {
    return true;
  }

  try {
    JSON.parse(content);
    return true;
  } catch {
    return false;
  }
}

jsonLineCount(): number {
  const content = this.configForm.get('body')?.value ?? '';
  return content ? content.split('\n').length : 0;
}

jsonCharCount(): number {
  const content = this.configForm.get('body')?.value ?? '';
  return content ? content.length : 0;
}

  // ==========================================================================
  // PARAM METHODS
  // ==========================================================================

  addParam() {
    this.paramsArray.push(this.createParamGroup());
  }

  removeParam(index: number) {
    this.paramsArray.removeAt(index);

    const params: Record<string, string> = {};

    this.paramsArray.controls.forEach((control) => {
      const key = control.get('key')?.value?.trim();
      const value = control.get('value')?.value ?? '';

      if (key) {
        params[key] = value;
      }
    });

    this.requestsService.updateActiveRequest({ params });
  }

  onParamKeyChange(event: Event, index: number) {
    const value = (event.target as HTMLInputElement).value;
    const group = this.paramsArray.at(index) as FormGroup;
    group.patchValue({ key: value }, { emitEvent: true });
  }

  onParamValueChange(event: Event, index: number) {
    const value = (event.target as HTMLInputElement).value;
    const group = this.paramsArray.at(index) as FormGroup;

    group.patchValue({ value: value }, { emitEvent: true });

    if (!this.isUpdating) {
      this.emitParamsChange();
    }
  }

  onParamPaginationChange(event: Event, index: number) {
    const value = (event.target as HTMLInputElement).value;
    const group = this.paramsArray.at(index) as FormGroup;

    group.patchValue({ description: value }, { emitEvent: true });

    if (!this.isUpdating) {
      this.emitParamsChange();
    }
  }

  // ==========================================================================
  // HEADER METHODS
  // ==========================================================================

  addHeader() {
    this.headersArray.push(this.createHeaderGroup());
  }

  removeHeader(index: number) {
    this.headersArray.removeAt(index);

    const headers: Record<string, string> = {};

    this.headersArray.controls.forEach((control) => {
      const key = control.get('key')?.value?.trim();
      const value = control.get('value')?.value ?? '';

      if (key) {
        headers[key] = value;
      }
    });

    this.requestsService.updateActiveRequest({
      headers,
    });
  }

  onHeadersKeyChange(event: Event, index: number) {
    const value = (event.target as HTMLInputElement).value;
    const group = this.headersArray.at(index) as FormGroup;

    group.patchValue({ key: value }, { emitEvent: true });

    if (!this.isUpdating) {
      this.emitHeadersChange();
    }
  }

  onHeadersValueChange(event: Event, index: number) {
    const value = (event.target as HTMLInputElement).value;
    const group = this.headersArray.at(index) as FormGroup;

    group.patchValue({ value: value }, { emitEvent: true });

    if (!this.isUpdating) {
      this.emitHeadersChange();
    }
  }

  // ==========================================================================
  // EMIT CHANGES METHODS
  // ==========================================================================

  private emitParamsChange() {
    const validParams: Record<string, string> = {};

    const paramsRawValue = this.paramsArray.getRawValue();
    console.log('Params raw value:', paramsRawValue);

    for (const item of paramsRawValue) {
      const key = item?.key?.trim();
      const value = item?.value?.trim();

      if (key) {
        validParams[key] = value || '';
      }
    }

    console.log('VALID PARAMS', validParams);

    if (Object.keys(validParams).length > 0) {
     // this.change.emit({ params: validParams });
      this.requestsService.updateActiveRequest({ params: validParams });
    }
  }

  private emitHeadersChange() {
    if (this.isUpdating) return;

    const validHeaders: Record<string, string> = {};
    let hasValidHeaders = false;

    this.headersArray.controls.forEach((group) => {
      const keyControl = group.get('key');
      const valueControl = group.get('value');
      const key = (keyControl?.value ?? '').toString().trim();
      const value = (valueControl?.value ?? '').toString().trim();

      if (key && key !== 'Authorization') {
        validHeaders[key] = value;
        hasValidHeaders = true;
      }
    });

    const authHeader = this.getAuthorizationHeader();
    if (authHeader) {
      validHeaders['Authorization'] = authHeader;
      hasValidHeaders = true;
    }

    //this.change.emit({ headers: hasValidHeaders ? validHeaders : undefined });
    this.requestsService.updateActiveRequest({ headers: validHeaders });
  }

  // ==========================================================================
  // UI METHODS
  // ==========================================================================

  toggleCollapse() {
    this.isCollapsed.update((v) => !v);
  }

  setActiveTab(tab: 'params' | 'headers' | 'auth' | 'body') {
    this.saveCurrentFormChanges();
    this.activeTab.set(tab);
  }

  private saveCurrentFormChanges() {
    if (this.paramsArray.length > 0) {
      this.emitParamsChange();
    }

    if (this.headersArray.length > 0) {
      this.emitHeadersChange();
    }

    const authValue = this.configForm.get('auth')?.value;
    if (authValue && authValue.type !== 'none') {
      this.requestsService.updateActiveRequest({ auth: authValue });
    }

    const bodyValue = this.configForm.get('body')?.value;
    if (bodyValue) {
      this.requestsService.updateActiveRequest({ body: bodyValue });
    }
  }
}
