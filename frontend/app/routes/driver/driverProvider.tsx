import { useSearchParams } from "@remix-run/react";
import { type ReactNode, createContext, useContext } from "react";
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
  let { data, error, isLoading } = useChairGetNotification({
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "text/event-stream",
    },
  });
  // react-queryでstatusCodeが取れない && 現状statusCode:204はBlobで帰ってくる
  if (data instanceof Blob) {
    data = undefined;
  }

  if (error === null) {
    error = undefined;
  }

  /**
   * TODO: SSE処理
   */

  return (
    <requestContext.Provider value={{ data, error, isLoading }}>
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
