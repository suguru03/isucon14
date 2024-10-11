import { useSearchParams } from "@remix-run/react";
import { type ReactNode, createContext, useContext, useMemo } from "react";
import {
  useChairGetNotification,
  type ChairGetNotificationError,
} from "~/apiClient/apiComponents";
import type { ChairRequest, RequestStatus } from "~/apiClient/apiSchemas";
import type { User as Chair } from "~/types";

const DriverContext = createContext<Partial<Chair>>({});

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
  const notificationResponse = useChairGetNotification({
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

    let fetchedData: Partial<ChairRequest> = data ?? {};
    if (data instanceof Blob) {
      fetchedData = {};
    }

    // TODO:
    return { ...fetchedData, status } as ChairRequest;
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

export const DriverProvider = ({ children }: { children: ReactNode }) => {
  // TODO:
  const [searchParams] = useSearchParams();
  const accessTokenParameter = searchParams.get("access_token");
  const chairIdParameter = searchParams.get("id");

  const chair: Partial<Chair> = useMemo(() => {
    if (accessTokenParameter !== null && chairIdParameter !== null) {
      requestIdleCallback(() => {
        sessionStorage.setItem("chair_access_token", accessTokenParameter);
        sessionStorage.setItem("chair_id", chairIdParameter);
      });
      return {
        accessToken: accessTokenParameter,
        id: chairIdParameter,
        name: "ISUCON太郎",
      };
    }
    const accessToken =
      sessionStorage.getItem("chair_access_token") ?? undefined;
    const id = sessionStorage.getItem("chair_id") ?? undefined;
    return {
      accessToken,
      id,
      name: "ISUCON太郎",
    };
  }, [accessTokenParameter, chairIdParameter]);

  return (
    <DriverContext.Provider value={chair}>
      <RequestProvider accessToken={chair.accessToken ?? ""}>
        {children}
      </RequestProvider>
    </DriverContext.Provider>
  );
};

export const useDriver = () => useContext(DriverContext);

export const useRequest = () => useContext(RequestContext);
