import { HttpClient } from '@angular/common/http';
import { Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalService } from '../../core/services/modal-service/modal-service';
import { RequestsService } from '../../core/services/requests-service/requests-service';
import { ApiRequest } from '../../core/interfaces/api-request.interface';

@Component({
  selector: 'app-sidebar',
  imports: [FormsModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  private readonly http = inject(HttpClient);
  private readonly requestsService = inject(RequestsService);

  collections = this.requestsService.collections;
  onSelectRequest = output<string>();
  onNewCollection = output<void>();
  onSearch = output<string>();
  searchTerm = signal('');
  modalService = inject(ModalService);
  isDrawerOpen = signal(false);
  isDrawerClosing = signal(false);

  newCollectionName = '';
  newRequestName = '';

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
        this.closeDrawer();
        this.resetForm();
      },
      error: (err) => {
        if (err.status === 409) {
          alert('Ese nombre ya está en uso, intenta con otro.');
        } else {
          alert('Ocurrió un error inesperado.');
        }
      },
    });
  }

  private resetForm(): void {
    this.newCollectionName = '';
    this.newRequestName = '';
  }

  search(event: Event) {}

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
          error: (err) => {
            console.error('Error saving collection state:', err);
          },
        });
    }
  }

  onSelectRequestFromSidebar(requestId: string): void {
    this.onSelectRequest.emit(requestId);
  }

  onNewCollectionClick(): void {
    this.onNewCollection.emit();
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.onSearch.emit(value);
  }

  onNavigate(route: string): void {
    console.log('Navigate to:', route);
  }

  selectRequest(collectionId: string, request: ApiRequest): void {
    console.log('clicked');
    this.requestsService.setActiveRequest(collectionId, request);
  }
}
