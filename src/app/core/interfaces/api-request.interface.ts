export interface ApiRequest {
  requestId: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  params?: Record<string, string>;
  headers?: Record<string, string>;
  auth?: {
    type: 'none' | 'bearer' | 'basic';
    token?: string;
    username?: string;
    password?: string;
  };
  body?: any;
  response?: any;
  savedAt?: string;
  collectionId?: string;
  collectionName?: string;
}
