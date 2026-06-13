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

  requestData = input<ApiRequest | null>();
  change = output<Partial<ApiRequest>>();
  isCollapsed = signal(false);
  activeTab = signal<'params' | 'headers' | 'auth' | 'body'>('params');

  // Auth signals (Mantenidas para tu template)
  authType = signal<'none' | 'bearer' | 'basic'>('none');
  showBearerToken = signal<boolean>(false);
  bearerToken = signal<string>('');
  basicUsername = signal<string>('');
  basicPassword = signal<string>('');

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

  constructor() {

  }

  ngOnInit() {
    const data = this.requestData();
    if (data) {
      this.paramsArray.clear();
      this.headersArray.clear();

      const params = data.params || {};

      Object.entries(params).forEach(([key, value]) => {
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

        this.paramsArray.push(
          this.fb.group({
            key: [key],
            value: [stringValue],
            description: [''],
          }),
        );
      });

      const headers = data.headers || {};
      Object.entries(headers).forEach(([key, value]) => {
        this.headersArray.push(
          this.fb.group({
            key: [key],
            value: [value],
          }),
        );
      });

      if (data.auth) {
        this.authType.set(data.auth.type || 'none');
        this.bearerToken.set(data.auth.token || '');
        this.basicUsername.set(data.auth.username || '');
        this.basicPassword.set(data.auth.password || '');
      }

      this.configForm.patchValue(
        {
          auth: data.auth,
          body: data.body,
        },
        { emitEvent: false },
      );
    }
  }

  // --- Helpers de Formulario ---
  get paramsArray() {
    return this.configForm.get('params') as FormArray;
  }
  get headersArray() {
    return this.configForm.get('headers') as FormArray;
  }

  // --- Métodos de Auth (Conectados a señales y form) ---
  onAuthTypeChange(type: 'none' | 'bearer' | 'basic') {
    this.authType.set(type);
    this.configForm.patchValue({ auth: { ...this.configForm.value.auth, type } });
  }

  toggleBearerVisibility() {
    this.showBearerToken.update((v) => !v);
  }

  onBearerTokenChange(token: string) {
    this.bearerToken.set(token);
    this.configForm.patchValue({ auth: { ...this.configForm.value.auth, token } });
  }

  onBasicUsernameChange(username: string) {
    this.basicUsername.set(username);
    this.configForm.patchValue({ auth: { ...this.configForm.value.auth, username } });
  }

  onBasicPasswordChange(password: string) {
    this.basicPassword.set(password);
    this.configForm.patchValue({ auth: { ...this.configForm.value.auth, password } });
  }

  onBodyInput(event: Event) {
    const value = (event.target as HTMLTextAreaElement).value;
    this.configForm.patchValue({ body: value });
  }

  // --- Métodos de UI ---
  addParam() {
    this.paramsArray.push(this.fb.group({ key: [''], value: [''], description: [''] }));
  }
  removeParam(index: number) {
    this.paramsArray.removeAt(index);
  }
  addHeader() {
    this.headersArray.push(this.fb.group({ key: [''], value: [''] }));
  }
  removeHeader(index: number) {
    this.headersArray.removeAt(index);
  }
  toggleCollapse() {
    this.isCollapsed.update((v) => !v);
  }
  setActiveTab(tab: any) {
    this.activeTab.set(tab);
  }
}
