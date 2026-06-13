import { ApiRequest } from "./api-request.interface";

export interface ActiveRequest {
  collectionId: string;
  request: ApiRequest;
};
