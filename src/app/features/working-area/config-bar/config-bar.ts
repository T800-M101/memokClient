import { Component, inject, input, output, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ApiRequest } from '../../../core/interfaces/api-request.interface';

@Component({
  selector: 'app-config-bar',
  imports: [ReactiveFormsModule],
  templateUrl: './config-bar.html',
  styleUrl: './config-bar.scss',
})
export class ConfigBar {
private fb = inject(FormBuilder);

  requestData = input<ApiRequest>();
  change = output<Partial<ApiRequest>>();
  isCollapsed = signal(false);


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
  }

  get paramsArray(): FormArray {
    return this.paramsForm.get('params') as FormArray;
  }

  get headersArray(): FormArray {
    return this.headersForm.get('headers') as FormArray;
  }

  ngOnInit() {
    this.initForms();
    this.initAuthFromRequest();
  }

   toggleCollapse() {
    console.log('click')
    this.isCollapsed.update(v => !v);
  }

  private initAuthFromRequest() {
    // const auth = this.requestData()?.auth;

    // if (auth?.type === 'bearer') {
    //   this.authType.set('bearer');
    //   this.bearerToken.set(auth.token || '');
    // } else if (auth?.type === 'basic') {
    //   this.authType.set('basic');
    //   this.basicUsername.set(auth.username || '');
    //   this.basicPassword.set(auth.password || '');
    // } else {
    //   this.authType.set('none');
    // }
  }

  private initForms() {
    const existingParams = this.requestData()?.params || {};
    const paramKeys = Object.keys(existingParams);

    if (paramKeys.length > 0) {
      for (const key of paramKeys) {
        this.addParam(key, existingParams[key]);
      }
    } else {
      this.addParam('', '');
    }

    const existingHeaders = this.requestData()?.headers || {};
    const headerKeys = Object.keys(existingHeaders).filter(key => key !== 'Authorization');

    if (headerKeys.length > 0) {
      for (const key of headerKeys) {
        this.addHeader(key, existingHeaders[key]);
      }
    } else {
      this.addHeader('', '');
    }

    this.paramsArray.valueChanges.subscribe(() => this.emitParamsChange());
    this.headersArray.valueChanges.subscribe(() => this.emitHeadersChange());
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
  }

  removeHeader(index: number) {
    this.headersArray.removeAt(index);
  }

  private emitParamsChange() {
    const validParams: Record<string, string> = {};
    let hasValidParams = false;

    this.paramsArray.controls.forEach((group) => {
      const key = group.get('key')?.value?.trim();
      const value = group.get('value')?.value?.trim();

      if (key) {
        validParams[key] = value || '';
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

    this.change.emit({
      headers: hasValidHeaders ? validHeaders : undefined
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

  setActiveTab(tab: 'params' | 'headers' | 'auth' | 'body') {
    this.activeTab.set(tab);
  }

  onAuthTypeChange(type: 'none' | 'bearer' | 'basic') {
    this.authType.set(type);

    if (type === 'none') {
      this.change.emit({ auth: { type: 'none' } });
      this.emitHeadersChange();
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
      this.change.emit({
        auth: { type: 'bearer', token: token.trim() }
      });
    } else if (!token.trim()) {
      this.change.emit({ auth: { type: 'none' } });
    }

    this.emitHeadersChange();
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
      this.change.emit({
        auth: { type: 'basic', username: username.trim(), password: password.trim() }
      });
    } else if (this.authType() === 'basic') {
      this.change.emit({ auth: { type: 'none' } });
    }

    this.emitHeadersChange();
  }

  onBodyInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    const normalized = value?.toString().trim().length ? value : undefined;
    this.change.emit({ body: normalized });
  }
}
