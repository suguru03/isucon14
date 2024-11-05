import { RequestId } from "./apiClient/apiParameters";
import type { Dispatch, SetStateAction } from "react";
import {
  Coordinate as ApiCoodinate,
  AppChair,
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
    chair?: AppChair;
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

export type Pos = {
  x: number;
  y: number;
};

export type Coordinate = ApiCoodinate;
