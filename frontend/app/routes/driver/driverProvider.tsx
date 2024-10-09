import { useSearchParams } from "@remix-run/react";
import { type ReactNode, createContext, useContext, useMemo } from "react";
import {
  useChairGetNotification,
  type ChairGetNotificationError,
} from "~/apiClient/apiComponents";
import type { ChairRequest } from "~/apiClient/apiSchemas";

export type AccessToken = string;

type User = {
  id: string;
  name: string;
  accessToken: AccessToken;
};
const driverContext = createContext<Partial<User>>({});
const requestContext = createContext<{
  data?: ChairRequest;
  error?: ChairGetNotificationError;
  isLoading: boolean;
}>({ isLoading: false });

const RequestProvider = ({
  children,
  accessToken,
}: {
  children: ReactNode;
  accessToken: string;
}) => {
  const notification = useChairGetNotification({
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "text/event-stream",
    },
  });

  const { data, error } = notification;
  const isLoading = notification.isLoading;

  // react-queryでstatusCodeが取れない && 現状statusCode:204はBlobで帰ってくる
  const fetchedData = useMemo(
    () => (data instanceof Blob ? undefined : data),
    [data],
  );
  const fetchedError = useMemo(
    () => (error === null ? undefined : error),
    [error],
  );

  /**
   * TODO: SSE処理
   */

  return (
    <requestContext.Provider
      value={{ data: fetchedData, error: fetchedError, isLoading }}
    >
      {children}
    </requestContext.Provider>
  );
};

export const DriverProvider = ({ children }: { children: ReactNode }) => {
  const [searchParams] = useSearchParams();
  const accessToken = searchParams.get("access_token") ?? undefined;
  const id = searchParams.get("user_id") ?? undefined;

  if (accessToken === undefined || id === undefined) {
    return <div>must set access_token and user_id</div>;
  }

  return (
    <driverContext.Provider
      value={{
        id,
        accessToken,
        name: "ISUCON太郎",
      }}
    >
      <RequestProvider accessToken={accessToken}>{children}</RequestProvider>
    </driverContext.Provider>
  );
};

export const useDriver = () => useContext(driverContext);
export const useRequest = () => useContext(requestContext);
