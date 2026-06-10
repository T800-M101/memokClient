export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  duration: string;
  body: any;
  timestamp: string;
}
