import { useSearchParams } from "@remix-run/react";
import { type ReactNode, createContext, useContext, useMemo } from "react";
import {
  useChairGetNotification,
  type ChairGetNotificationError,
} from "~/apiClient/apiComponents";
import type { ChairRequest } from "~/apiClient/apiSchemas";
import { User } from "~/types";

const driverContext = createContext<Partial<User>>({});
const requestContext = createContext<{
  data?: ChairRequest;
  error?: ChairGetNotificationError | null;
  isLoading: boolean;
}>({ isLoading: false });

const RequestProvider = ({
  children,
  accessToken,
}: {
  children: ReactNode;
  accessToken: string;
}) => {
  const { data, error, isLoading } = useChairGetNotification({
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "text/event-stream",
    },
  });

  // react-queryでstatusCodeが取れない && 現状statusCode:204はBlobで帰ってくる
  const fetchedData = useMemo(
    () => (data instanceof Blob ? undefined : data),
    [data],
  );

  /**
   * TODO: SSE処理
   */

  return (
    <requestContext.Provider value={{ data: fetchedData, error, isLoading }}>
      {children}
    </requestContext.Provider>
  );
};

export const DriverProvider = ({ children }: { children: ReactNode }) => {
  const [searchParams] = useSearchParams();
  const accessToken = searchParams.get("access_token");
  const id = searchParams.get("user_id");
  if (accessToken === null || id === null) {
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
