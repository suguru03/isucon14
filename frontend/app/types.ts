import { RideId } from "./api/api-parameters";
import {
  Coordinate as ApiCoodinate,
  RideStatus,
  User,
} from "./api/api-schemas";

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

// TODO: この型はデバッグ用の型なので削除する
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
};

export type SimulatorChair = {
  id: string;
  name: string;
  model: string;
  token: string;
  coordinateState: {
    coordinate?: Coordinate;
    setter: (coordinate: Coordinate) => void;
  };
  chairNotification?: ClientChairRide;
};

export type SimulatorOwner = {
  id: string;
  name: string;
  token: string;
  chair?: SimulatorChair;
};

export type DisplayPos = {
  x: number;
  y: number;
};

export type NearByChair = {
  id: string;
  name: string;
  model: string;
  current_coordinate: Coordinate;
};

export type Coordinate = ApiCoodinate;

export type ClientApiError = {
  message: string;
  name: string;
  stack: {
    payload: string;
    status: number;
  };
};

export type CampaignData = {
  invitationCode: string;
  registedAt: string;
  used: boolean;
};

// TODO: 後で場所をutilに移動する
export function isClientApiError(e: unknown): e is ClientApiError {
  if (typeof e === "object" && e !== null) {
    const typedError = e as {
      name?: unknown;
      message?: unknown;
      stack?: {
        status?: unknown;
        payload?: unknown;
      };
    };
    return (
      typeof typedError.name === "string" &&
      typeof typedError.message === "string" &&
      typeof typedError.stack === "object" &&
      typedError.stack !== null &&
      typeof typedError.stack.status === "number" &&
      typeof typedError.stack.payload === "string"
    );
  }
  return false;
}
