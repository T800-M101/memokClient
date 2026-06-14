import { ModalService } from './../../core/services/modal-service/modal-service';
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RequestBar } from './request-bar/request-bar';
import { ConfigBar } from './config-bar/config-bar';
import { ResponseSection } from './response-section/response-section';
import { RequestsService } from '../../core/services/requests-service/requests-service';


@Component({
  selector: 'app-working-area',
  standalone: true,
  imports: [CommonModule, RequestBar, ConfigBar, ResponseSection],
  templateUrl: './working-area.html',
  styleUrls: ['./working-area.scss'],
})
export class WorkingArea {
  modalService = inject(ModalService);


requestsService = inject(RequestsService);
  readonly activeRequest = this.requestsService.activeRequest;
}
