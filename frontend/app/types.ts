import { Chair, User } from "./apiClient/apiSchemas";
import { Coordinate } from "~/apiClient/apiSchemas";
import { RequestId } from "./apiClient/apiParameters";
import { RequestStatus } from "~/apiClient/apiSchemas";
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
    userId?: string;
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
};
