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
requestsService = inject(RequestsService);
  readonly activeRequest = this.requestsService.activeRequest;

  // Ya no necesitamos formularios locales ni lógica de carga aquí.
  // Todo eso se delega a ConfigBar.

  createNewRequest(): void {
    const emptyRequest: ApiRequest = {
      requestId: crypto.randomUUID(),
      name: 'New Request',
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
