import { Component, computed, inject, output, signal, effect } from '@angular/core';
import { RequestsService } from '../../core/services/requests-service/requests-service';
import { FormsModule } from '@angular/forms';
import { ModalService } from '../../core/services/modal-service/modal-service';
import { ApiRequest } from '../../core/interfaces/api-request.interface';
import { NotificationService } from '../../core/services/notifications/notification-service';

export interface NewRequestData {
  name: string;
  collectionId: string;
  newCollectionName: string;
}

@Component({
  selector: 'app-modal',
  imports: [FormsModule],
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
})
export class Modal {
  private readonly requestsService = inject(RequestsService);
  private readonly modalService = inject(ModalService);
  private readonly notificationService = inject(NotificationService);

  // Output
  requestSaved = output<ApiRequest>();

  readonly isOpen = this.modalService.isOpen;
  readonly isClosing = this.modalService.isClosing;

  // Form fields
  requestName = signal('');
  selectedCollectionId = signal('');
  newCollectionName = signal('');
  collections = this.requestsService.collections;
  isEditing = this.requestsService.activeRequest()?.requestId;

  readonly showNewCollectionInput = computed(() => this.selectedCollectionId() === 'new');

  readonly isValid = computed(() => {
    const hasName = this.requestName().trim().length > 0;
    const hasCollection = this.selectedCollectionId() !== '';

    if (this.showNewCollectionInput()) {
      return hasName && this.newCollectionName().trim().length > 0;
    }
    return hasName && hasCollection;
  });

  constructor() {
    effect(() => {
      const request = this.requestsService.activeRequest();
      const isOpen = this.isOpen();

      if (request && isOpen) {
        this.loadRequestData(request);
      } else if (!isOpen) {
        this.resetForm();
      }
    });
  }

  private loadRequestData(request: ApiRequest): void {
    this.requestName.set(request.name || '');
    if (request.collectionId) {
      this.selectedCollectionId.set(request.collectionId);
    }
  }

  closeModal(): void {
    this.modalService.closeModal();
  }

  save(): void {
    if (!this.isValid()) return;

    if (this.showNewCollectionInput()) {
      this.requestsService.createCollection(this.newCollectionName(), []).subscribe({
        next: (newCollection) => {
          const requestData = this.buildRequestData(newCollection.collectionId);
          this.saveRequestToBackend(requestData);
        },
        error: (err) => {
          console.error('Error creating collection:', err);
          this.notificationService.error(`Error: ${err.message || 'Unknown error'}`);
        },
      });
    } else {
      const requestData = this.buildRequestData(this.selectedCollectionId());
      this.saveRequestToBackend(requestData);
    }
  }

  private buildRequestData(collectionId: string): ApiRequest {
    const existing = this.requestsService.activeRequest();

    if (existing) {
      return {
        ...existing,
        name: this.requestName(),
        collectionId: collectionId,
      };
    } else {
      return {
        requestId: '',
        collectionId: collectionId,
        name: this.requestName(),
        method: 'GET',
        url: '',
        params: {},
        headers: {},
        auth: { type: 'none' },
        body: null,
      };
    }
  }

  private saveRequestToBackend(request: ApiRequest): void {
    const isUpdate = !!this.requestsService.activeRequest()?.requestId;

    if (isUpdate) {
      this.requestsService.updateRequest(request.requestId, request).subscribe({
        next: (response) => {
          this.notificationService.success('Request updated successfully!');
          this.requestSaved.emit(request);
          this.closeModal();
        },
        error: (err) => console.error('Error updating request:', err),
      });
    } else {
      this.requestsService.addRequest(request).subscribe({
        next: (savedRequest: ApiRequest) => {
          this.notificationService.success('Request saved successfully!');
          this.requestSaved.emit(savedRequest);
          this.closeModal();
        },
        error: (err) => console.error('Error saving request:', err),
      });
    }
  }

  resetForm(): void {
    this.requestName.set('');
    this.selectedCollectionId.set('');
    this.newCollectionName.set('');
  }
}
