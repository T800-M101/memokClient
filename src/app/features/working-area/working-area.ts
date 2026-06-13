import { Component, inject } from '@angular/core';
import { RequestBar } from './request-bar/request-bar';
import { ConfigBar } from './config-bar/config-bar';
import { ResponseSection } from './response-section/response-section';
import { RequestsService } from '../../core/services/requests-service/requests-service';

@Component({
  selector: 'app-working-area',
  imports: [RequestBar, ConfigBar, ResponseSection],
  templateUrl: './working-area.html',
  styleUrl: './working-area.scss',
})
export class WorkingArea {
  private requestsService = inject(RequestsService);

  activeRequest = this.requestsService.activeRequest;

}
