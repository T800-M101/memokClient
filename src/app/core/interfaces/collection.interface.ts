import { ApiRequest } from "./api-request.interface";

export interface Collection {
  collectionId: string;
  name: string;
  description?: string;
  icon?: string;
  requests: ApiRequest[];
  isExpanded?: boolean;
}
