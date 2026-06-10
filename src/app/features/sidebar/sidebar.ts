import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-sidebar',
  imports: [FormsModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {

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
    console.log('New Collection:', this.newCollectionName);
    console.log('New Request:', this.newRequestName);
    this.closeDrawer();
  }

  resetForm(): void {
    this.newCollectionName = '';
    this.newRequestName = '';
  }
  collections = signal([
    {
      collectionId: '1',
      title: 'Users API',
      isExpanded: false,
      requests: [
        {
          requestId: 'req-1',
          name: 'Get All Users',
          method: 'GET',
          url: 'https://reqres.in/api/users'
        },
        {
          requestId: 'req-2',
          name: 'Get Single User',
          method: 'GET',
          url: 'https://reqres.in/api/users/2'
        },
        {
          requestId: 'req-3',
          name: 'Create User',
          method: 'POST',
          url: 'https://reqres.in/api/users'
        },
        {
          requestId: 'req-4',
          name: 'Update User',
          method: 'PUT',
          url: 'https://reqres.in/api/users/2'
        },
        {
          requestId: 'req-5',
          name: 'Delete User',
          method: 'DELETE',
          url: 'https://reqres.in/api/users/2'
        }
      ]
    },
    {
      collectionId: '2',
      title: 'Posts API',
      isExpanded: false,
      requests: [
        {
          requestId: 'req-6',
          name: 'Get All Posts',
          method: 'GET',
          url: 'https://jsonplaceholder.typicode.com/posts'
        },
        {
          requestId: 'req-7',
          name: 'Get Post by ID',
          method: 'GET',
          url: 'https://jsonplaceholder.typicode.com/posts/1'
        },
        {
          requestId: 'req-8',
          name: 'Create Post',
          method: 'POST',
          url: 'https://jsonplaceholder.typicode.com/posts'
        },
        {
          requestId: 'req-9',
          name: 'Update Post',
          method: 'PUT',
          url: 'https://jsonplaceholder.typicode.com/posts/1'
        },
        {
          requestId: 'req-10',
          name: 'Delete Post',
          method: 'DELETE',
          url: 'https://jsonplaceholder.typicode.com/posts/1'
        }
      ]
    },
    {
      collectionId: '3',
      title: 'Products API',
      isExpanded: false,
      requests: [
        {
          requestId: 'req-11',
          name: 'Get Products',
          method: 'GET',
          url: 'https://fakestoreapi.com/products'
        },
        {
          requestId: 'req-12',
          name: 'Get Product by ID',
          method: 'GET',
          url: 'https://fakestoreapi.com/products/1'
        },
        {
          requestId: 'req-13',
          name: 'Create Product',
          method: 'POST',
          url: 'https://fakestoreapi.com/products'
        },
        {
          requestId: 'req-14',
          name: 'Update Product',
          method: 'PUT',
          url: 'https://fakestoreapi.com/products/1'
        }
      ]
    },
    {
      collectionId: '4',
      title: 'Auth API',
      isExpanded: false,
      requests: [
        {
          requestId: 'req-15',
          name: 'Login',
          method: 'POST',
          url: 'https://reqres.in/api/login'
        },
        {
          requestId: 'req-16',
          name: 'Register',
          method: 'POST',
          url: 'https://reqres.in/api/register'
        },
        {
          requestId: 'req-17',
          name: 'Get Profile',
          method: 'GET',
          url: 'https://reqres.in/api/users/2'
        }
      ]
    }
  ]);
  onSelectRequest = output<string>();
  onNewCollection = output<void>();
  onSearch = output<string>();

  // Estado local para búsqueda
  searchTerm = signal('');

  search(event: Event){

  }

  getFolderIcon(isExpanded: boolean): string {
  return isExpanded ? 'fas fa-folder-open' : 'fas fa-folder';
}

  toggleCollection(collectionId: string): void {
    // Implementar toggle de colección
    const collection = this.collections().find(c => c.collectionId === collectionId);
    if (collection) {
      collection.isExpanded = !collection.isExpanded;
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



}
