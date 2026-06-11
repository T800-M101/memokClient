import { Component, computed, inject, output, signal } from '@angular/core';
import { RequestsService } from '../../core/services/requests-service/requests-service';
import { FormsModule } from '@angular/forms';
import { ModalService } from '../../core/services/modal-service/modal-service';

export interface NewRequestData {
  name: string;
  collectionId: string;
  newCollectionName?: string;
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

    const data = {
      name: this.requestName().trim(),
      collectionId: this.selectedCollectionId(),
      newCollectionName: this.showNewCollectionInput()
        ? this.newCollectionName().trim()
        : undefined,
    };

    console.log('Saving:', data);
    this.closeModal();
  }

  resetForm(): void {
    this.requestName.set('');
    this.selectedCollectionId.set('');
    this.newCollectionName.set('');
  }
}
