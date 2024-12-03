import { CampaignData, Coordinate } from "~/types";

const GroupId = "isuride";

const setStorage = (
  fieldId: string,
  itemData: number | string | { [key: string]: unknown } | undefined | null,
  storage: Storage,
): boolean => {
  try {
    const existing = JSON.parse(
      localStorage.getItem(GroupId) || "{}",
    ) as Record<string, string>;
    storage.setItem(
      GroupId,
      JSON.stringify({ ...existing, [fieldId]: itemData }),
    );
    return true;
  } catch (e) {
    return false;
  }
};

const getStorage = <T>(fieldId: string, storage: Storage): T | null => {
  try {
    const data = JSON.parse(storage.getItem(GroupId) || "{}") as Record<
      string,
      unknown
    >;
    return (data[fieldId] ?? null) as T | null;
  } catch (e) {
    return null;
  }
};

export const saveCampaignData = (campaign: CampaignData) => {
  return setStorage("campaign", campaign, localStorage);
};

export const getCampaignData = (): CampaignData | null => {
  return getStorage("campaign", localStorage);
};

export const setSimulatorCurrentCoordinate = (coordinate: Coordinate, id?: string) => {
  return id ? setStorage(`simulator.${id}.currentCoordinate`, coordinate, sessionStorage) : setStorage(`simulator.currentCoordinate`, coordinate, sessionStorage);
};

export const getSimulatorCurrentCoordinate = (id?: string): Coordinate | null => {
  return id ? getStorage(`simulator.${id}.currentCoordinate`, sessionStorage) : getStorage(`simulator.currentCoordinate`, sessionStorage);
};

export const setSimulatorStartCoordinate = (coordinate: Coordinate, id?: string) => {
  return id ? setStorage(`simulator.${id}.startCoordinate`, coordinate, sessionStorage) : setStorage(`simulator.startCoordinate`, coordinate, sessionStorage);
};

export const getSimulatorStartCoordinate = (id?: string): Coordinate | null => {
  return id ? getStorage(`simulator.${id}.startCoordinate`, sessionStorage) : getStorage(`simulator.startCoordinate`, sessionStorage);
};

export const setUserId = (id: string) => {
  return setStorage("user.id", id, sessionStorage);
};

export const getUserId = (): string | null => {
  return getStorage("user.id", sessionStorage);
};

export const setUserAccessToken = (id: string) => {
  return setStorage("user.accessToken", id, sessionStorage);
};

export const getUserAccessToken = (): string | null => {
  return getStorage("user.accessToken", sessionStorage);
};
