import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RequestBar } from './request-bar/request-bar';
import { ConfigBar } from './config-bar/config-bar';
import { ResponseSection } from './response-section/response-section';
import { RequestsService } from '../../core/services/requests-service/requests-service';
import { ApiRequest } from '../../core/interfaces/api-request.interface';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-working-area',
  standalone: true,
  imports: [CommonModule, RequestBar, ConfigBar, ResponseSection],
  templateUrl: './working-area.html',
  styleUrls: ['./working-area.scss'],
})
export class WorkingArea {
private fb = inject(FormBuilder);
  requestsService = inject(RequestsService);

  requestData = input<ApiRequest | undefined>();
  change = output<Partial<ApiRequest>>();
  isCollapsed = signal(false);

  readonly activeRequest = this.requestsService.activeRequest;
  requestDataForConfig = computed(() => this.activeRequest() ?? undefined);

  // Tab state
  activeTab = signal<'params' | 'headers' | 'auth' | 'body'>('params');

  // Auth signals
  authType = signal<'none' | 'bearer' | 'basic'>('none');
  showBearerToken = signal<boolean>(false);
  bearerToken = signal<string>('');
  basicUsername = signal<string>('');
  basicPassword = signal<string>('');

  // Forms
  paramsForm: FormGroup;
  headersForm: FormGroup;

  constructor() {
    this.paramsForm = this.fb.group({
      params: this.fb.array([])
    });

    this.headersForm = this.fb.group({
      headers: this.fb.array([])
    });

      effect(() => {
        const request = this.activeRequest();
      if (request) {
        this.loadRequestData(request);
      }
    });

  }



  get paramsArray(): FormArray {
    return this.paramsForm.get('params') as FormArray;
  }

  get headersArray(): FormArray {
    return this.headersForm.get('headers') as FormArray;
  }

  ngOnInit() {
    // Subscribe to form changes to receive updates
    this.paramsArray.valueChanges.subscribe(() => this.emitParamsChange());
    this.headersArray.valueChanges.subscribe(() => this.emitHeadersChange());
  }

  toggleCollapse() {
    this.isCollapsed.update(v => !v);
  }

  /**
   * Load the request data into the forms
   */
  private loadRequestData(request: ApiRequest): void {
    // Load Auth
    if (request.auth?.type === 'bearer') {
      this.authType.set('bearer');
      this.bearerToken.set(request.auth.token || '');
    } else if (request.auth?.type === 'basic') {
      this.authType.set('basic');
      this.basicUsername.set(request.auth.username || '');
      this.basicPassword.set(request.auth.password || '');
    } else {
      this.authType.set('none');
    }

    // Load Params
    this.loadParams(request.params || {});

    // Load Headers (excluding Authorization)
    this.loadHeaders(request.headers || {});
  }

  /**
   * Load the parameters into the FormArray
   */
  private loadParams(params: Record<string, string>): void {
    // Clean existing array
    while (this.paramsArray.length) {
      this.paramsArray.removeAt(0);
    }

    const paramKeys = Object.keys(params);
    if (paramKeys.length > 0) {
      for (const key of paramKeys) {
        this.addParam(key, params[key]);
      }
    } else {
      this.addParam('', '');
    }
  }

  /**
   * Load the headers into the FormArray
   */
  private loadHeaders(headers: Record<string, string>): void {
    // Clean existing array
    while (this.headersArray.length) {
      this.headersArray.removeAt(0);
    }

    const headerKeys = Object.keys(headers).filter(key => key !== 'Authorization');
    if (headerKeys.length > 0) {
      for (const key of headerKeys) {
        this.addHeader(key, headers[key]);
      }
    } else {
      this.addHeader('', '');
    }
  }

  createParamGroup(key: string = '', value: string = '', description: string = ''): FormGroup {
    return this.fb.group({
      key: [key],
      value: [value],
      description: [description]
    });
  }

  createHeaderGroup(key: string = '', value: string = ''): FormGroup {
    return this.fb.group({
      key: [key],
      value: [value]
    });
  }

  addParam(key: string = '', value: string = '', description: string = '') {
    this.paramsArray.push(this.createParamGroup(key, value, description));
  }

  addHeader(key: string = '', value: string = '') {
    this.headersArray.push(this.createHeaderGroup(key, value));
  }

  removeParam(index: number) {
    this.paramsArray.removeAt(index);
    this.emitParamsChange();
  }

  removeHeader(index: number) {
    this.headersArray.removeAt(index);
    this.emitHeadersChange();
  }

 private emitParamsChange() {
  const validParams: Record<string, string> = {};
  let hasValidParams = false;

  this.paramsArray.controls.forEach((group) => {
    const keyControl = group.get('key');
    const valueControl = group.get('value');
    const key = (keyControl?.value ?? '').toString().trim();
    const value = (valueControl?.value ?? '').toString().trim();

    if (key) {
      validParams[key] = value;
      hasValidParams = true;
    }
  });

  this.change.emit({
    params: hasValidParams ? validParams : undefined
  });
}

  private emitHeadersChange() {
    const validHeaders: Record<string, string> = {};
    let hasValidHeaders = false;

    this.headersArray.controls.forEach((group) => {
      const key = group.get('key')?.value?.trim();
      const value = group.get('value')?.value?.trim();

      if (key && key !== 'Authorization') {
        validHeaders[key] = value || '';
        hasValidHeaders = true;
      }
    });

    const authHeader = this.getAuthorizationHeader();
    if (authHeader) {
      validHeaders['Authorization'] = authHeader;
      hasValidHeaders = true;
    }

    if (hasValidHeaders) {
      this.requestsService.updateActiveRequest({ headers: validHeaders });
    }
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

  setActiveTab(tab: 'params' | 'headers' | 'auth' | 'body') {
    this.activeTab.set(tab);
  }

  onAuthTypeChange(type: 'none' | 'bearer' | 'basic') {
    this.authType.set(type);

    if (type === 'none') {
      this.requestsService.updateActiveRequest({ auth: { type: 'none' } });
    } else if (type === 'bearer') {
      this.onBearerTokenChange(this.bearerToken());
    } else if (type === 'basic') {
      this.updateBasicAuth();
    }
  }

  toggleBearerVisibility() {
    this.showBearerToken.update(v => !v);
  }

  onBearerTokenChange(token: string) {
    this.bearerToken.set(token);

    if (this.authType() === 'bearer' && token.trim()) {
      this.requestsService.updateActiveRequest({
        auth: { type: 'bearer', token: token.trim() }
      });
    } else if (!token.trim()) {
      this.requestsService.updateActiveRequest({ auth: { type: 'none' } });
    }
  }

  onBasicUsernameChange(username: string) {
    this.basicUsername.set(username);
    this.updateBasicAuth();
  }

  onBasicPasswordChange(password: string) {
    this.basicPassword.set(password);
    this.updateBasicAuth();
  }

  private updateBasicAuth() {
    const username = this.basicUsername();
    const password = this.basicPassword();

    if (this.authType() === 'basic' && username.trim() && password.trim()) {
      this.requestsService.updateActiveRequest({
        auth: { type: 'basic', username: username.trim(), password: password.trim() }
      });
    } else if (this.authType() === 'basic') {
      this.requestsService.updateActiveRequest({ auth: { type: 'none' } });
    }
  }

  onBodyInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    const normalized = value?.toString().trim().length ? value : undefined;
    this.requestsService.updateActiveRequest({ body: normalized });
  }

  createNewRequest(): void {
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

  updateActiveRequest(changes: Partial<ApiRequest>): void {
    this.requestsService.updateActiveRequest(changes);
  }
}
