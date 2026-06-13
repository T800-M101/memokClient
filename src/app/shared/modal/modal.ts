import { Component, computed, inject, output, signal, input, effect } from '@angular/core';
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

  // Output para notificar cuando se guarda
  requestSaved = output<ApiRequest>();

  // Exponer signals del servicio
  readonly isOpen = this.modalService.isOpen;
  readonly isClosing = this.modalService.isClosing;
  readonly requestToEdit = this.modalService.requestToEdit;

  // Form fields
  requestName = signal('');
  selectedCollectionId = signal('');
  newCollectionName = signal('');
  collections = this.requestsService.collections;

  // Indica si estamos editando una request existente
  isEditing = computed(() => !!this.requestToEdit());

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

  constructor() {
    // Effect para cargar datos cuando se abre el modal con una request para editar
    effect(() => {
      const request = this.requestToEdit();
      if (request && this.isOpen()) {
        this.loadRequestData(request);
      }
    });
  }

  /**
   * Carga los datos de la request a editar
   */
  private loadRequestData(request: ApiRequest): void {
    this.requestName.set(request.name || '');
    if (request.collectionId) {
      this.selectedCollectionId.set(request.collectionId);
    }
  }

  /**
   * Cierra el modal
   */
  closeModal(): void {
    this.modalService.closeModal();
    this.resetForm();
  }

  /**
   * Guarda la request (nueva o actualizada)
   */
  save(): void {
    if (!this.isValid()) return;

    if (this.showNewCollectionInput()) {
      // Crear nueva colección primero
      this.requestsService.createCollection(this.newCollectionName(), []).subscribe({
        next: (newCollection) => {
          const requestData = this.buildRequestData(newCollection.collectionId);
          this.saveRequestToBackend(requestData);
        },
        error: (err) => {
          console.error('Error creating collection:', err);
          alert('Could not create new collection.');
        }
      });
    } else {
      // Guardar en colección existente
      const requestData = this.buildRequestData(this.selectedCollectionId());
      this.saveRequestToBackend(requestData);
    }
  }

  /**
   * Construye el objeto request desde los datos del formulario
   */
  private buildRequestData(collectionId: string): ApiRequest {
    const existing = this.requestToEdit();

    if (existing) {
      // Actualizar request existente - preservar todos los datos
      return {
        ...existing,
        name: this.requestName(),
        collectionId: collectionId
      };
    } else {
      // Crear nueva request - valores por defecto
      return {
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
    }
  }

  /**
   * Guarda la request en el backend usando addRequest
   */
  private saveRequestToBackend(request: ApiRequest): void {
    console.log('Saving request to backend:', request);

    this.requestsService.addRequest(request).subscribe({
      next: (savedRequest: ApiRequest) => {
        console.log('Request saved successfully:', savedRequest);
        this.requestSaved.emit(savedRequest);
        this.closeModal();
      },
      error: (err: any) => {
        console.error('Error saving request:', err);
        alert(`Error saving the request: ${err.message || 'Unknown error'}`);
      }
    });
  }

  /**
   * Resetea todos los campos del formulario
   */
  resetForm(): void {
    this.requestName.set('');
    this.selectedCollectionId.set('');
    this.newCollectionName.set('');
  }
}

