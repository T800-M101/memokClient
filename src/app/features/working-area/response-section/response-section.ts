import { Component, inject } from '@angular/core';
import { RequestsService } from '../../../core/services/requests-service/requests-service';
import { CommonModule, DatePipe } from '@angular/common';
import { NgxJsonViewerModule } from 'ngx-json-viewer';

@Component({
  selector: 'app-response-section',
  imports: [CommonModule, DatePipe, NgxJsonViewerModule],
  templateUrl: './response-section.html',
  styleUrl: './response-section.scss',
})
export class ResponseSection {
   private requestsService = inject(RequestsService);

  readonly response = this.requestsService.response;
  readonly isLoading = this.requestsService.isLoading;
  readonly error = this.requestsService.error;

  showHeaders = false;

    // Method to obtain the number of headers
  getHeadersCount(headers: Record<string, string>): number {
    return headers ? Object.keys(headers).length : 0;
  }

  // Method to obtain header keys
  getHeaderKeys(headers: Record<string, string>): string[] {
    return headers ? Object.keys(headers) : [];
  }

  getBodySize(): string {
    const resp = this.response();
    if (!resp?.body) return '0 B';

    const bodyStr = JSON.stringify(resp.body);
    const size = new Blob([bodyStr]).size;

    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  getStatusClass(): string {
    const resp = this.response();
    if (!resp) return '';
    return resp.status >= 200 && resp.status < 300 ? 'success' : 'error';
  }

  getStatusIcon(): string {
    const resp = this.response();
    if (!resp) return 'fa-circle';
    return resp.status >= 200 && resp.status < 300 ? 'fa-check-circle' : 'fa-exclamation-circle';
  }

  copyResponse(): void {
    const resp = this.response();
    if (!resp?.body) return;

    const text = JSON.stringify(resp.body, null, 2);
    navigator.clipboard.writeText(text);

    // Mostrar feedback visual
    const btn = document.querySelector('.copy-btn');
    if (btn) {
      btn.classList.add('copied');
      setTimeout(() => btn.classList.remove('copied'), 1500);
    }
  }

  saveResponse(): void {
    const resp = this.response();
    if (!resp) return;

    const dataStr = JSON.stringify(resp, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `response-${Date.now()}.json`;
    link.click();

    URL.revokeObjectURL(url);
  }

  clearResponse(): void {
    this.requestsService.clearResponse();
  }

}
