import { RequestId } from "./apiClient/apiParameters";
import {
  Coordinate as ApiCoodinate,
  Chair,
  RequestStatus,
  User,
} from "./apiClient/apiSchemas";

export type AccessToken = string;

export type ClientAppRequest = {
  status?: RequestStatus;
  payload?: Partial<{
    request_id: RequestId;
    coordinate: Partial<{
      pickup: Coordinate;
      destination: Coordinate;
    }>;
    chair?: Chair;
  }>;
  auth: {
    accessToken: AccessToken;
  };
  user?: {
    id?: string;
    name?: string;
  };
};

export type ClientChairRequest = {
  status?: RequestStatus;
  payload?: Partial<{
    request_id: RequestId;
    coordinate: Partial<{
      pickup: Coordinate;
      destination: Coordinate;
    }>;
    user?: User;
  }>;
  auth: {
    accessToken: AccessToken;
    userId?: string;
  };
  chair?: {
    id: string;
    name: string;
  };
};

export type Pos = {
  x: number;
  y: number;
};

export type Coordinate = ApiCoodinate;
