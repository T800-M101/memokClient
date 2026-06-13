import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RequestBar } from './request-bar/request-bar';
import { ConfigBar } from './config-bar/config-bar';
import { ResponseSection } from './response-section/response-section';
import { RequestsService } from '../../core/services/requests-service/requests-service';
import { ApiRequest } from '../../core/interfaces/api-request.interface';

@Component({
  selector: 'app-working-area',
  standalone: true,
  imports: [CommonModule, RequestBar, ConfigBar, ResponseSection],
  templateUrl: './working-area.html',
  styleUrls: ['./working-area.scss'],
})
export class WorkingArea {
  private requestsService = inject(RequestsService);

  activeRequest = this.requestsService.activeRequest;

  createNewRequest(): void {
    const emptyRequest: ApiRequest = {
      requestId: crypto.randomUUID(),
      name: 'Untitled Request',
      method: 'GET',
      url: '',
      params: {},
      headers: {},
      auth: { type: 'none' },
      body: null,
    };
    this.requestsService.setActiveRequest('', emptyRequest);
  }
}
