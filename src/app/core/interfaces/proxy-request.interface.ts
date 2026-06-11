export interface ProxyRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
}
