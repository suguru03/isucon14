import type { Dispatch, SetStateAction } from "react";
import { RideId } from "./apiClient/apiParameters";
import {
  Coordinate as ApiCoodinate,
  RideStatus,
  User,
} from "./apiClient/apiSchemas";

export type AccessToken = string;

export type ClientAppChair = {
  id: string;
  name: string;
  model: string;
  stats: Partial<{
    total_rides_count: number;
    total_evaluation_avg: number;
  }>;
};

export type ClientAppRide = {
  status?: RideStatus;
  payload?: Partial<{
    ride_id: RideId;
    coordinate: Partial<{
      pickup: Coordinate;
      destination: Coordinate;
    }>;
    chair?: ClientAppChair;
  }>;
  auth: {
    accessToken: AccessToken;
  };
  user?: {
    id?: string;
    name?: string;
  };
};

export type ClientChairRide = {
  status?: RideStatus;
  payload?: Partial<{
    ride_id: RideId;
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
