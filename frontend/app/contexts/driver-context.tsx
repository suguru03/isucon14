import { useSearchParams } from "@remix-run/react";
import {
  type ReactNode,
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import type {
  ChairRequest,
  RequestStatus,
  User,
  Coordinate,
} from "~/apiClient/apiSchemas";
import { RequestId } from "~/apiClient/apiParameters";
import type { AccessToken } from "~/types";
import { EventSourcePolyfill } from "event-source-polyfill";
import { apiBaseURL } from "~/apiClient/APIBaseURL";
import { fetchChairGetNotification } from "~/apiClient/apiComponents";

type ClientChairRequest = {
  status?: RequestStatus;
  payload?: Partial<{
    request_id: RequestId;
    coordinate: Partial<{
      pickup: Coordinate;
      destination: Coordinate;
    }>;
    user?: User;
  }>;
  auth: {
    accessToken: AccessToken;
    userId?: string;
  };
};

export const useClientChairRequest = (accessToken: string, id?: string) => {
  const [searchParams] = useSearchParams();
  const [clientChairPayloadWithStatus, setClientChairPayloadWithStatus] =
    useState<Omit<ClientChairRequest, "auth">>();
  const isSSE = false;
  useEffect(() => {
    if (isSSE) {
      /**
       * WebAPI標準のものはAuthヘッダーを利用できないため
       */
      const eventSource = new EventSourcePolyfill(
        `${apiBaseURL}/chair/notification`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      eventSource.onmessage = (event) => {
        if (typeof event.data === "string") {
          const eventData = JSON.parse(event.data) as ChairRequest;
          setClientChairPayloadWithStatus((preRequest) => {
            if (
              preRequest === undefined ||
              eventData.status !== preRequest.status ||
              eventData.request_id !== preRequest.payload?.request_id
            ) {
              return {
                status: eventData.status,
                payload: {
                  request_id: eventData.request_id,
                  coordinate: {
                    pickup: eventData.destination_coordinate, // TODO: set pickup
                    destination: eventData.destination_coordinate,
                  },
                  user: eventData.user,
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
    } else {
      const abortController = new AbortController();
      (async () => {
        const appRequest = await fetchChairGetNotification(
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
          abortController.signal,
        );
        setClientChairPayloadWithStatus({
          status: appRequest.status,
          payload: {
            request_id: appRequest.request_id,
            coordinate: {
              pickup: appRequest.destination_coordinate, // TODO: set pickup
              destination: appRequest.destination_coordinate,
            },
            user: appRequest.user,
          },
        });
      })().catch((e) => {
        console.error(`ERROR: ${e}`);
      });
    }
  }, [accessToken, setClientChairPayloadWithStatus, isSSE]);

  const responseClientAppRequest = useMemo<
    ClientChairRequest | undefined
  >(() => {
    const debugStatus =
      (searchParams.get("debug_status") as RequestStatus) ?? undefined;
    const debugDestinationCoordinate = ((): Coordinate | undefined => {
      // expected format: 123,456
      const v = searchParams.get("debug_destination_coordinate") ?? "";
      const m = v.match(/(\d+),(\d+)/);
      if (!m) return;
      return { latitude: Number(m[1]), longitude: Number(m[2]) };
    })();
    const candidateAppRequest = clientChairPayloadWithStatus;
    if (debugStatus !== undefined && candidateAppRequest) {
      candidateAppRequest.status = debugStatus;
    }
    if (
      debugDestinationCoordinate &&
      candidateAppRequest?.payload?.coordinate
    ) {
      candidateAppRequest.payload.coordinate.destination =
        debugDestinationCoordinate;
    }
    return {
      ...candidateAppRequest,
      auth: {
        accessToken,
        userId: id,
      },
    };
  }, [clientChairPayloadWithStatus, searchParams, accessToken, id]);

  return responseClientAppRequest;
};

const DriverContext = createContext<Partial<ClientChairRequest>>({});

export const DriverProvider = ({ children }: { children: ReactNode }) => {
  // TODO:
  const [searchParams] = useSearchParams();
  const accessTokenParameter = searchParams.get("access_token");
  const chairIdParameter = searchParams.get("id");

  const { accessToken, id } = useMemo(() => {
    if (accessTokenParameter !== null && chairIdParameter !== null) {
      requestIdleCallback(() => {
        sessionStorage.setItem("user_access_token", accessTokenParameter);
        sessionStorage.setItem("user_id", chairIdParameter);
      });
      return {
        accessToken: accessTokenParameter,
        id: chairIdParameter,
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
  }, [accessTokenParameter, chairIdParameter]);

  const request = useClientChairRequest(accessToken ?? "", id ?? "");

  return (
    <DriverContext.Provider value={{ ...request }}>
      {children}
    </DriverContext.Provider>
  );
};

export const useDriver = () => useContext(DriverContext);
