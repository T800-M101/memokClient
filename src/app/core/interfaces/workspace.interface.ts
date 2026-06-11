import { ApiRequest } from "./api-request.interface";

export interface WorkspaceState {
  activeRequestId: string | null;
  requests: ApiRequest[];
  unsavedChanges: Record<string, boolean>; 
}
