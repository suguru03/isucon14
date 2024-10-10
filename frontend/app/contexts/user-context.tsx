import { useSearchParams } from "@remix-run/react";
import { type ReactNode, createContext, useContext, useMemo } from "react";
import {
  useAppGetNotification,
  type AppGetNotificationError,
} from "~/apiClient/apiComponents";
import type { AppRequest, RequestStatus } from "~/apiClient/apiSchemas";
import type { User } from "~/types";

const UserContext = createContext<Partial<User>>({});

const RequestContext = createContext<{
  data?: AppRequest;
  error?: AppGetNotificationError | null;
  isLoading: boolean;
}>({ isLoading: false });

const RequestProvider = ({
  children,
  accessToken,
}: {
  children: ReactNode;
  accessToken: string;
}) => {
  const notificationResponse = useAppGetNotification({
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "text/event-stream",
    },
  });
  const { data, error, isLoading } = notificationResponse;

  // react-queryでstatusCodeが取れない && 現状statusCode:204はBlobで帰ってくる
  const [searchParams] = useSearchParams();
  const fetchedData = useMemo(() => {
    if (data instanceof Blob) {
      return undefined;
    }
    // TODO:
    const status = (searchParams.get("debug_status") ?? undefined) as
      | RequestStatus
      | undefined;
    return { ...data, status } as AppRequest;
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

export const UserProvider = ({ children }: { children: ReactNode }) => {
  // TODO:
  const [searchParams] = useSearchParams();
  const accessToken = searchParams.get("access_token") ?? undefined;
  const id = searchParams.get("user_id") ?? undefined;

  if (accessToken === undefined || id === undefined) {
    return <div>must set access_token and user_id</div>;
  }

  return (
    <UserContext.Provider
      value={{
        id,
        accessToken,
        name: "ISUCON太郎",
      }}
    >
      <RequestProvider accessToken={accessToken}>{children}</RequestProvider>
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

export const useRequest = () => useContext(RequestContext);
