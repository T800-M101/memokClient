import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { RequestsService } from '../../core/services/requests-service/requests-service';
import { ModalService } from '../../core/services/modal-service/modal-service';
import { NotificationService } from '../../core/services/notifications/notification-service';
import { ApiRequest } from '../../core/interfaces/api-request.interface';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
})
export class Modal {
  private readonly requestsService = inject(RequestsService);
  private readonly notificationService = inject(NotificationService);
  readonly modalService = inject(ModalService);
  readonly collections = this.requestsService.collections;
  readonly showNewCollectionInput = computed(
    () => this.modalService.selectedCollectionId() === 'new',
  );

  isValid(): boolean {
    return this.modalService.isValid();
  }

  save(): void {
    const currentRequest = this.modalService.workableRequest();

    if (!currentRequest || !this.isValid()) {
      return;
    }

    const collectionId = this.getTargetCollectionId();

    if (this.modalService.isEditing()) {
      this.updateRequestInCollection(currentRequest, collectionId);
    } else {
      this.saveNewRequestToCollection(currentRequest, collectionId);
    }
  }

  private getTargetCollectionId(): string {
    if (this.modalService.selectedCollectionId() === 'new') {
      return crypto.randomUUID();
    }

    return this.modalService.selectedCollectionId();
  }

  private saveNewRequestToCollection(currentRequest: ApiRequest, collectionId: string): void {
    const requestToSave: ApiRequest = {
      ...currentRequest,
      collectionId,
      requestId: currentRequest.requestId.startsWith('temp-')
        ? crypto.randomUUID()
        : currentRequest.requestId,
    };

    this.requestsService
      .addRequestToCollection(collectionId, requestToSave, this.modalService.newCollectionName())
      .subscribe({
        next: (savedRequest) => {
          console.log('Request saved successfully:', savedRequest);
          this.notificationService.show('Request saved successfully');

          if (this.requestsService.activeRequest()?.requestId === currentRequest.requestId) {
            this.requestsService.updateActiveRequest(savedRequest);
          }

          this.closeModal();
        },
        error: (error) => {
          console.error('Error saving request:', error);
          this.notificationService.error('Error saving request');
        },
      });
  }

  private updateRequestInCollection(currentRequest: ApiRequest, collectionId: string): void {
    const currentCollection = this.requestsService
      .collections()
      .find((col) => col.requests.some((req) => req.requestId === currentRequest.requestId));

    if (currentCollection && currentCollection.collectionId !== collectionId) {
      this.moveRequestToCollection(currentRequest, currentCollection.collectionId, collectionId);
      return;
    }

    const updatedRequest: ApiRequest = {
      ...currentRequest,
      collectionId,
    };

    this.requestsService.updateRequest(currentRequest.requestId, updatedRequest).subscribe({
      next: () => {
        console.log('Request updated successfully');
        this.notificationService.show('Request updated successfully');

        this.closeModal();
      },
      error: (error) => {
        console.error('Error updating request:', error);
        this.notificationService.error('Error updating request');
      },
    });
  }

  private moveRequestToCollection(
    request: ApiRequest,
    fromCollectionId: string,
    toCollectionId: string,
  ): void {
    this.requestsService.moveRequest(request, fromCollectionId, toCollectionId).subscribe({
      next: () => {
        console.log('Request moved successfully');
        this.notificationService.show('Request moved successfully');
        this.closeModal();
      },
      error: (error) => {
        console.error('Error moving request:', error);
        this.notificationService.error('Error moving request');
      },
    });
  }

  closeModal(): void {
    this.modalService.closeModal();
  }

  // ngModel helpers
  updateSelectedCollectionId(value: string): void {
    this.modalService.updateSelectedCollectionId(value);
  }

  updateNewCollectionName(value: string): void {
    this.modalService.updateNewCollectionName(value);
  }
}
