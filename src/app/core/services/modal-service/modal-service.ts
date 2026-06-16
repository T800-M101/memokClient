import { computed, inject, Injectable, signal } from '@angular/core';
import { RequestsService } from '../requests-service/requests-service';
import { ApiRequest } from '../../interfaces/api-request.interface';
import { NotificationService } from '../notifications/notification-service';

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  private readonly requestService =
    inject(RequestsService);

  private readonly notificationService =
    inject(NotificationService);

  // ==================================================
  // UI STATE
  // ==================================================

  private readonly _isOpen = signal(false);
  private readonly _isEditing = signal(false);
  private readonly _isClosing = signal(false);

  readonly isOpen =
    this._isOpen.asReadonly();

  readonly isEditing =
    this._isEditing.asReadonly();

  readonly isClosing =
    this._isClosing.asReadonly();

  // ==================================================
  // FORM STATE
  // ==================================================

  private readonly _selectedCollectionId =
    signal<string>('');

  private readonly _newCollectionName =
    signal<string>('');

  readonly selectedCollectionId =
    this._selectedCollectionId.asReadonly();

  readonly newCollectionName =
    this._newCollectionName.asReadonly();

  readonly showNewCollectionInput =
    computed(
      () =>
        this._selectedCollectionId() ===
        'new'
    );

  // ==================================================
  // DATA
  // ==================================================

  readonly collections =
    this.requestService.collections;

  private readonly _workableRequest =
    signal<ApiRequest | null>(null);

  readonly workableRequest =
    this._workableRequest.asReadonly();

  // ==================================================
  // MODAL ACTIONS
  // ==================================================

  openModal(request: ApiRequest): void {
    this.resetForm();

    this._workableRequest.set(request);
    this._isEditing.set(false);
    this._isOpen.set(true);
  }

  editing(request: ApiRequest): void {
    this.resetForm();

    this._workableRequest.set(request);
    this._isEditing.set(true);

    const collection =
      this.requestService
        .collections()
        .find((col) =>
          col.requests.some(
            (req) =>
              req.requestId ===
              request.requestId
          )
        );

    this._selectedCollectionId.set(
      collection?.collectionId ?? ''
    );

    this._isOpen.set(true);
  }

  closeModal(): void {
    this._isClosing.set(true);

    setTimeout(() => {
      this._isOpen.set(false);
      this._isClosing.set(false);

      this.resetForm();
    }, 250);
  }

  // ==================================================
  // FORM HELPERS
  // ==================================================

  updateSelectedCollectionId(
    value: string
  ): void {
    this._selectedCollectionId.set(value);
  }

  updateNewCollectionName(
    value: string
  ): void {
    this._newCollectionName.set(value);
  }

  isValid(): boolean {
    if (
      this._selectedCollectionId() ===
      'new'
    ) {
      return (
        this._newCollectionName()
          .trim()
          .length > 0
      );
    }

    return !!this._selectedCollectionId();
  }

  // ==================================================
  // SAVE FLOW
  // ==================================================

  save(): void {
    const currentRequest =
      this._workableRequest();

    if (
      !currentRequest ||
      !this.isValid()
    ) {
      return;
    }

    if (this._isEditing()) {
      this.updateExistingRequest(
        currentRequest
      );
    } else {
      this.saveNewRequest(
        currentRequest
      );
    }
  }

  private saveNewRequest(
    currentRequest: ApiRequest
  ): void {
    const isNewCollection =
      this._selectedCollectionId() ===
      'new';

    const requestToSave: ApiRequest = {
      ...currentRequest,
      name:
        currentRequest.name ||
        'Untitled Request',
      requestId:
        currentRequest.requestId.startsWith(
          'temp-'
        )
          ? crypto.randomUUID()
          : currentRequest.requestId,
    };

    // ==================================
    // CREATE NEW COLLECTION
    // ==================================
    if (isNewCollection) {
      const collectionName =
        this._newCollectionName().trim();

      this.requestService
        .createCollection(
          collectionName
        )
        .subscribe({
          next: (newCollection) => {
            const updatedRequest = {
              ...requestToSave,
              collectionId:
                newCollection.collectionId,
            };

            this.requestService
              .addRequestToCollection(
                newCollection.collectionId,
                updatedRequest
              )
              .subscribe({
                next: (
                  savedRequest
                ) => {
                  this.updateActiveRequestAfterSave(
                    savedRequest
                  );

                  this.notificationService.show(
                    'Request saved successfully'
                  );

                  this.closeModal();
                },
                error: (error) => {
                  console.error(
                    'Error saving request:',
                    error
                  );

                  this.notificationService.error(
                    'Error saving request'
                  );
                },
              });
          },
          error: (error) => {
            console.error(
              'Error creating collection:',
              error
            );

            this.notificationService.error(
              'Error creating collection'
            );
          },
        });

      return;
    }

    // ==================================
    // SAVE TO EXISTING COLLECTION
    // ==================================
    const collectionId =
      this._selectedCollectionId();

    const updatedRequest = {
      ...requestToSave,
      collectionId,
    };

    this.requestService
      .addRequestToCollection(
        collectionId,
        updatedRequest
      )
      .subscribe({
        next: (savedRequest) => {
          this.updateActiveRequestAfterSave(
            savedRequest
          );

          this.notificationService.show(
            'Request saved successfully'
          );

          this.closeModal();
        },
        error: (error) => {
          console.error(
            'Error saving request:',
            error
          );

          this.notificationService.error(
            'Error saving request'
          );
        },
      });
  }

  private updateExistingRequest(
    currentRequest: ApiRequest
  ): void {
    const collectionId =
      this._selectedCollectionId();

    const requestToUpdate: ApiRequest =
      {
        ...currentRequest,
        collectionId,
      };

    this.requestService
      .updateRequest(
        currentRequest.requestId,
        requestToUpdate
      )
      .subscribe({
        next: () => {
          this.updateActiveRequestAfterSave(
            requestToUpdate
          );

          this.notificationService.show(
            'Request updated successfully'
          );

          this.closeModal();
        },
        error: (error) => {
          console.error(
            'Error updating request:',
            error
          );

          this.notificationService.error(
            'Error updating request'
          );
        },
      });
  }

  // ==================================================
  // HELPERS
  // ==================================================

  private updateActiveRequestAfterSave(
    savedRequest: ApiRequest
  ): void {
    const activeRequest =
      this.requestService.activeRequest();

    if (
      activeRequest?.requestId ===
      savedRequest.requestId
    ) {
      this.requestService.updateActiveRequest(
        savedRequest
      );
    }
  }

  private resetForm(): void {
    this._workableRequest.set(null);

    this._selectedCollectionId.set(
      ''
    );

    this._newCollectionName.set('');

    this._isEditing.set(false);
  }
}
