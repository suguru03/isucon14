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

export const setSimulatorCoordinate = (coordinate: Coordinate) => {
  return setStorage("simulator.coordinate", coordinate, sessionStorage);
};

export const getSimulatorCoordinate = (): Coordinate | null => {
  return getStorage("simulator.coordinate", sessionStorage);
};

export const setUserId = (id: string) => {
  return setStorage("user.id", id, sessionStorage);
};

export const getUserId = (): string | null => {
  return getStorage("user.id", sessionStorage);
};

export const setUserAccessToken = (id: string) => {
  return setStorage("user.accessToekn", id, sessionStorage);
};

export const getUserAccessToken = (): string | null => {
  return getStorage("user.accessToekn", sessionStorage);
};
