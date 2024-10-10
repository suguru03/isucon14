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
  const responseData = useMemo(() => {
    const status = (searchParams.get("debug_status") ?? undefined) as
      | RequestStatus
      | undefined;

    let fetchedData: Partial<AppRequest> = data ?? {};
    if (data instanceof Blob) {
      fetchedData = {};
    }

    // TODO:
    return { ...fetchedData, status } as AppRequest;
  }, [data, searchParams]);

  /**
   * TODO: SSE処理
   */

  return (
    <RequestContext.Provider value={{ data: responseData, error, isLoading }}>
      {children}
    </RequestContext.Provider>
  );
};

export const UserProvider = ({ children }: { children: ReactNode }) => {
  // TODO:
  const [searchParams] = useSearchParams();
  const accessTokenParameter = searchParams.get("access_token");
  const userIdParameter = searchParams.get("id");

  const user: Partial<User> = useMemo(() => {
    if (accessTokenParameter !== null && userIdParameter !== null) {
      requestIdleCallback(() => {
        sessionStorage.setItem("user_access_token", accessTokenParameter);
        sessionStorage.setItem("user_id", userIdParameter);
      });
      return {
        accessToken: accessTokenParameter,
        id: userIdParameter,
        name: "ISUCON太郎",
      };
    }
    const accessToken =
      sessionStorage.getItem("user_access_token") ?? undefined;
    const id = sessionStorage.getItem("user_id") ?? undefined;
    return {
      accessToken,
      id,
      name: "ISUCON太郎",
    };
  }, [accessTokenParameter, userIdParameter]);

  return (
    <UserContext.Provider value={user}>
      <RequestProvider accessToken={user.accessToken ?? ""}>
        {children}
      </RequestProvider>
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

export const useRequest = () => useContext(RequestContext);
