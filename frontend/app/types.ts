import type { RequestId } from "./apiClient/apiParameters";
import type {
  Chair,
  Coordinate,
  RequestStatus,
  User,
} from "./apiClient/apiSchemas";
import type { Dispatch, SetStateAction } from "react";

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
    id?: string;
    name: string;
    currentCoordinate: {
      setter: Dispatch<SetStateAction<Coordinate | undefined>>;
      location?: Coordinate;
    };
  };
};
