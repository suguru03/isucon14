import { Coordinate as ApiCoodinate } from "./api/api-schemas";

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

export type CampaignData = {
  invitationCode: string;
  registedAt: string;
  used: boolean;
};

// TODO: 後でリファクタ
export type ClientApiError = {
  message: string;
  name: string;
  stack: {
    payload: string;
    status: number;
  };
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
