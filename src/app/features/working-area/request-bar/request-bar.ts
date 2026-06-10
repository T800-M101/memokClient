import { Component, inject, input, output } from '@angular/core';
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
    private requestsService = inject(RequestsService);

  requestData = input<ApiRequest>();
  change = output<Partial<ApiRequest>>();

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

  async sendRequest() {
    if (!this.url) return;

    const payload = {
      method: this.method,
      url: this.url,
      headers: this.requestData()?.headers || {},
      params: this.requestData()?.params || {},
      auth: this.requestData()?.auth || { type: 'none' },
      body: this.requestData()?.body || null
    };

    try {
      //await this.requestsService.sendRequest(payload);
    } catch (error) {
      console.error('Request failed:', error);
    }
  }

  // request-bar.component.ts
 async copyAsCurl() {
    const curlCommand = this.generateCurlCommand();

    try {
      await navigator.clipboard.writeText(curlCommand);

      // Cambiar estado a copiado
      this.isCopied = true;

      // Restaurar después de 2 segundos
      setTimeout(() => {
        this.isCopied = false;
      }, 2000);

    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }

generateCurlCommand(): string {
  const method = this.method;
  const url = this.url;
  const headers = this.requestData()?.headers || {};
  const body = this.requestData()?.body;

  let curl = `curl -X ${method} "${url}"`;

  Object.entries(headers).forEach(([key, value]) => {
    curl += ` \\\n  -H "${key}: ${value}"`;
  });

  if (body) {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    curl += ` \\\n  -d '${bodyStr}'`;
  }

  return curl;
}
}
