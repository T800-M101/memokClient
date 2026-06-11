import { ApiRequest } from "./api-request.interface";

export interface Collection {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  requests: ApiRequest[];
  createdAt: Date;
  updatedAt: Date;
  isExpanded?: boolean;
  isFavorite?: boolean;
  color?: string;
}
