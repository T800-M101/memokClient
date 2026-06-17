import { HttpClient } from '@angular/common/http';
import { Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalService } from '../../core/services/modal-service/modal-service';
import { RequestsService } from '../../core/services/requests-service/requests-service';
import { ApiRequest } from '../../core/interfaces/api-request.interface';
import { NotificationService } from '../../core/services/notifications/notification-service';
import { Collection } from '../../core/interfaces/collection.interface';

@Component({
  selector: 'app-sidebar',
  imports: [FormsModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  private readonly http = inject(HttpClient);
  requestsService = inject(RequestsService);
  private readonly notificationService = inject(NotificationService);
  modalService = inject(ModalService);

  collections = this.requestsService.collections;
  onSearch = output<string>();
  searchTerm = signal('');
  isDrawerOpen = signal(false);
  isDrawerClosing = signal(false);

  newCollectionName = '';
  newRequestName = '';

  // ==========================================================================
  // DRAWER MANAGEMENT
  // ==========================================================================

  toggleDrawer(): void {
    if (this.isDrawerOpen()) {
      this.closeDrawer();
    } else {
      this.openDrawer();
    }
  }

  openDrawer(): void {
    this.isDrawerClosing.set(false);
    this.isDrawerOpen.set(true);
  }

  closeDrawer(): void {
    this.isDrawerClosing.set(true);

    setTimeout(() => {
      this.isDrawerOpen.set(false);
      this.isDrawerClosing.set(false);
      this.resetForm();
    }, 250);
  }

  save(): void {
    const newCollection = {
      name: this.newCollectionName,
      requests: [{ name: this.newRequestName }],
    };

    this.http.post('/api/collections', newCollection).subscribe({
      next: () => {
        this.notificationService.success('Collection created successfully!');
        this.closeDrawer();
        this.resetForm();
      },
      error: (err) => {
        if (err.status === 409) {
          this.notificationService.error('That name is already in use. Please try another one.');
        } else {
          this.notificationService.error('An unexpected error occurred. Please try again.');
        }
      },
    });
  }

  private resetForm(): void {
    this.newCollectionName = '';
    this.newRequestName = '';
  }

  // ==========================================================================
  // SEARCH
  // ==========================================================================

  search(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.onSearch.emit(value);
  }

  // ==========================================================================
  // COLLECTION MANAGEMENT
  // ==========================================================================

  getFolderIcon(isExpanded: boolean): string {
    return isExpanded ? 'fas fa-folder-open' : 'fas fa-folder';
  }

  toggleCollection(collectionId: string): void {
    const collection = this.collections().find((c) => c.collectionId === collectionId);
    if (collection) {
      collection.isExpanded = !collection.isExpanded;
      this.http
        .put(`/api/collections/${collectionId}`, { isExpanded: collection.isExpanded })
        .subscribe({
          next: () => {
            // Silent success
          },
          error: (err) => {
            console.error('Error saving collection state:', err);
            this.notificationService.warning('Failed to save collection state.');
          },
        });
    }
  }

  /**
   * Delete a collection - No confirmation
   */
  deleteCollection(collectionId: string, event: Event): void {
    event.stopPropagation(); // Prevent triggering the collection toggle

    const collection = this.collections().find((c) => c.collectionId === collectionId);
    if (!collection) {
      this.notificationService.error('Collection not found');
      return;
    }

    // Delete from backend
    this.http.delete(`/api/collections/${collectionId}`).subscribe({
      next: () => {
        // Close any open requests from this collection
        const requestIds = collection.requests.map((req) => req.requestId);
        for (const reqId of requestIds) {
          this.requestsService.closeRequest(reqId);
        }

        // Refresh collections
        this.requestsService.getCollections();
        this.notificationService.success(`Collection "${collection.name}" deleted`);
      },
      error: (err) => {
        console.error('Error deleting collection:', err);
        this.notificationService.error('Failed to delete collection. Please try again.');
      },
    });
  }

  // ==========================================================================
  // REQUEST MANAGEMENT
  // ==========================================================================

  selectRequest(collectionId: string, request: ApiRequest): void {
    this.requestsService.setActiveRequest(collectionId, request);
  }

  /**
   * Delete a request from a collection - No confirmation
   */
  deleteRequest(collectionId: string, requestId: string, event: Event): void {
    event.stopPropagation(); // Prevent triggering the request selection

    const collection = this.collections().find((c) => c.collectionId === collectionId);
    if (!collection) {
      this.notificationService.error('Collection not found');
      return;
    }

    const request = collection.requests.find((req) => req.requestId === requestId);
    if (!request) {
      this.notificationService.error('Request not found');
      return;
    }

    // Delete from backend
    this.http.delete(`/api/collections/${collectionId}/requests/${requestId}`).subscribe({
      next: () => {
        // Close the request if it's open
        this.requestsService.closeRequest(requestId);

        // Refresh collections
        this.requestsService.getCollections();
        this.notificationService.success(`Request "${request.name}" deleted`);
      },
      error: (err) => {
        console.error('Error deleting request:', err);
        this.notificationService.error('Failed to delete request. Please try again.');
      },
    });
  }
}
