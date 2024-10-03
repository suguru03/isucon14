import { useSearchParams } from "@remix-run/react";
import { ReactNode, createContext, useContext } from "react";

export type AccessToken = string;

type Driver = {
  id: string;
  name: string;
  accessToken: AccessToken;
};
const driverContext = createContext<Partial<Driver>>({});

export const DriverProvider = ({ children }: { children: ReactNode }) => {
  const [searchParams] = useSearchParams();
  const accessToken = searchParams.get("driver_access_token") ?? undefined;
  if (accessToken === undefined) {
    return;
  }
  /**
   * TODO: ログイン情報取得処理
   */
  const fetchedValue: Driver = {
    id: "fetched-id",
    name: "fetched-name",
    accessToken,
  };

  return (
    <driverContext.Provider value={fetchedValue}>
      {children}
    </driverContext.Provider>
  );
};

export const useDriver = () => useContext(driverContext);
