import { useSearchParams } from "@remix-run/react";
import { type ReactNode, createContext, useContext, useMemo } from "react";
import {
  useChairGetNotification,
  type ChairGetNotificationError,
} from "~/apiClient/apiComponents";
import type { ChairRequest, RequestStatus } from "~/apiClient/apiSchemas";
import type { User } from "~/types";

const DriverContext = createContext<Partial<User>>({});
const RequestContext = createContext<{
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
  const [searchParams] = useSearchParams();

  // react-queryでstatusCodeが取れない && 現状statusCode:204はBlobで帰ってくる
  const fetchedData = useMemo(() => {
    if (data instanceof Blob) {
      return undefined;
    }
    // TODO:
    const status = (searchParams.get("debug_status") ??
      undefined) as RequestStatus;
    return { ...data, status } as ChairRequest;
  }, [data, searchParams]);

  /**
   * TODO: SSE処理
   */

  return (
    <RequestContext.Provider value={{ data: fetchedData, error, isLoading }}>
      {children}
    </RequestContext.Provider>
  );
};

export const DriverProvider = ({ children }: { children: ReactNode }) => {
  // TODO:
  const [searchParams] = useSearchParams();
  const accessToken = searchParams.get("access_token");
  const id = searchParams.get("user_id");
  if (accessToken === null || id === null) {
    return <div>must set access_token and user_id</div>;
  }

  return (
    <DriverContext.Provider
      value={{
        id,
        accessToken,
        name: "ISUCON太郎",
      }}
    >
      <RequestProvider accessToken={accessToken}>{children}</RequestProvider>
    </DriverContext.Provider>
  );
};

export const useDriver = () => useContext(DriverContext);

export const useRequest = () => useContext(RequestContext);
