import { Component, computed, inject, output, signal } from '@angular/core';
import { RequestsService } from '../../core/services/requests-service/requests-service';
import { FormsModule } from '@angular/forms';
import { ModalService } from '../../core/services/modal-service/modal-service';
import { ApiRequest } from '../../core/interfaces/api-request.interface';

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

  // Exponer signals del servicio
  readonly isOpen = this.modalService.isOpen;
  readonly isClosing = this.modalService.isClosing;

  // Form fields
  requestName = signal('');
  selectedCollectionId = signal('');
  newCollectionName = signal('');
  collections = this.requestsService.collections;

  // Computed values
  readonly showNewCollectionInput = computed(() => this.selectedCollectionId() === 'new');

  readonly isValid = computed(() => {
    const hasName = this.requestName().trim().length > 0;
    const hasCollection = this.selectedCollectionId() !== '';

    if (this.showNewCollectionInput()) {
      return hasName && this.newCollectionName().trim().length > 0;
    }
    return hasName && hasCollection;
  });

  openModal(): void {
    this.resetForm();
    this.modalService.open();
  }

  closeModal(): void {
    this.resetForm();
    this.modalService.close();
  }

save(): void {
    if (!this.isValid()) return;

    // 1. If the user chose "new", we must first create the collection
    if (this.showNewCollectionInput()) {
      this.requestsService.createCollection(this.newCollectionName(), []).subscribe({
        next: (newCollection) => {
          // Once created, we create the request using the ID returned by the server
          this.createRequest(newCollection.collectionId);
        },
        error: (err) => {
          console.error('Error al crear colección:', err);
          alert('No se pudo crear la nueva colección.');
        }
      });
    } else {
      // 2. If it already exists, we use the selected ID directly.
      this.createRequest(this.selectedCollectionId());
    }
  }

private createRequest(collectionId: string): void {
  const newRequest: ApiRequest = {
    requestId: crypto.randomUUID(),
    collectionId: collectionId,
    name: this.requestName(),
    method: 'GET',
    url: '',
    params: {},
    headers: {},
    auth: { type: 'none' },
    body: null
  };

  this.requestsService.addRequest(newRequest).subscribe({
    next: () => {
      console.log('Request guardada con éxito en el servidor');
      this.closeModal();
    },
    error: (err) => {
      console.error('Error al guardar request:', err);
      alert('Error al guardar la petición.');
    }
  });
  this.closeModal();
}

  resetForm(): void {
    this.requestName.set('');
    this.selectedCollectionId.set('');
    this.newCollectionName.set('');
  }
}
