import { useSearchParams } from "@remix-run/react";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type {
  AppRequest,
  Chair,
  Coordinate,
  RequestStatus,
} from "~/apiClient/apiSchemas";
import {
  type AppGetNotificationError,
  useAppGetNotification,
  fetchAppGetNotification,
} from "~/apiClient/apiComponents";
import type { User } from "~/types";
import { EventSourcePolyfill } from "event-source-polyfill";
import { useEffect, useState } from "react";
import { apiBaseURL } from "~/apiClient/APIBaseURL";
import { RequestId } from "~/apiClient/apiParameters";

type ClientAppRequest = {
  status?: RequestStatus;
  payload: Partial<{
    request_id: RequestId;
    coordinate: Partial<{
      pickup: Coordinate;
      destination: Coordinate;
    }>;
    chair?: Chair;
  }>;
};

export const useClientAppRequest = (accessToken: string) => {
  const [searchParams] = useSearchParams();
  const [clientAppRequest, setClientAppRequest] = useState<ClientAppRequest>();
  const isSSE = false;
  if (isSSE) {
    useEffect(() => {
      /**
       * WebAPI標準のものはAuthヘッダーを利用できないため
       */
      const eventSource = new EventSourcePolyfill(
        `${apiBaseURL}/app/notification`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      eventSource.onmessage = (event) => {
        if (typeof event.data === "string") {
          const eventData = JSON.parse(event.data) as AppRequest;
          setClientAppRequest((preRequest) => {
            if (
              preRequest === undefined ||
              eventData.status !== preRequest.status ||
              eventData.request_id !== preRequest.payload.request_id
            ) {
              return {
                status: eventData.status,
                payload: {
                  request_id: eventData.request_id,
                  coordinate: {
                    pickup: eventData.pickup_coordinate,
                    destination: eventData.destination_coordinate,
                  },
                  chair: eventData.chair,
                },
              };
            } else {
              return preRequest;
            }
          });
        }
        return () => {
          eventSource.close();
        };
      };
    }, [accessToken, setClientAppRequest]);
  } else {
    useEffect(() => {
      const abortController = new AbortController();
      (async () => {
        const appRequest = await fetchAppGetNotification(
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
          abortController.signal,
        );
        setClientAppRequest({
          status: appRequest.status,
          payload: {
            request_id: appRequest.request_id,
            coordinate: {
              pickup: appRequest.pickup_coordinate,
              destination: appRequest.destination_coordinate,
            },
            chair: appRequest.chair,
          },
        } satisfies ClientAppRequest);
      })();
      return () => {
        abortController.abort();
      };
    }, []);
  }

  const responseClientAppRequest = useMemo<ClientAppRequest | undefined>(() => {
    const debugStatus =
      (searchParams.get("debug_status") as RequestStatus) ?? undefined;
    const debugDestinationCoordinate = ((): Coordinate | undefined => {
      // expected format: 123,456
      const v = searchParams.get("debug_destination_coordinate") ?? "";
      const m = v.match(/(\d+),(\d+)/);
      if (!m) return;
      return { latitude: Number(m[1]), longitude: Number(m[2]) };
    })();
    const candidateAppRequest = clientAppRequest;
    if (debugStatus !== undefined && candidateAppRequest) {
      candidateAppRequest.status = debugStatus;
    }
    if (debugDestinationCoordinate && candidateAppRequest?.payload.coordinate) {
      candidateAppRequest.payload.coordinate.destination =
        debugDestinationCoordinate;
    }
    return candidateAppRequest;
  }, [clientAppRequest]);

  return responseClientAppRequest;
};

const UserContext = createContext<Partial<User>>({});

export const UserProvider = ({ children }: { children: ReactNode }) => {
  // TODO:
  const [searchParams] = useSearchParams();

  const accessTokenParameter = searchParams.get("access_token");
  const userIdParameter = searchParams.get("id");

  const { accessToken, id } = useMemo(() => {
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
    };
  }, [accessTokenParameter, userIdParameter]);

  const request = useClientAppRequest(accessToken ?? "");

  return (
    <UserContext.Provider
      value={{
        name: "ISUCON太郎",
        accessToken,
        id,
        request,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
