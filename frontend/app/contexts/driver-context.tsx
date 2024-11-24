import { useSearchParams } from "@remix-run/react";
import { EventSourcePolyfill } from "event-source-polyfill";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiBaseURL } from "~/apiClient/APIBaseURL";
import { fetchChairGetNotification } from "~/apiClient/apiComponents";
import type { ChairRide, Coordinate, RideStatus } from "~/apiClient/apiSchemas";
import type { ClientChairRide } from "~/types";

export const useClientChairRequest = (accessToken: string, id?: string) => {
  const [searchParams] = useSearchParams();
  const [clientChairPayloadWithStatus, setClientChairPayloadWithStatus] =
    useState<Omit<ClientChairRide, "auth" | "chair">>();
  const [coordinate, SetCoordinate] = useState<Coordinate>();
  const isSSE = localStorage.getItem("isSSE") === "true";
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
          const eventData = JSON.parse(event.data) as ChairRide;
          setClientChairPayloadWithStatus((preRequest) => {
            if (
              preRequest === undefined ||
              eventData.status !== preRequest.status ||
              eventData.id !== preRequest.payload?.ride_id
            ) {
              return {
                status: eventData.status,
                payload: {
                  ride_id: eventData.id,
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
      let timeoutId: number = 0;
      const abortController = new AbortController();
      const polling = () => {
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
            status: appRequest.data?.status,
            payload: {
              ride_id: appRequest.data?.ride_id,
              coordinate: {
                pickup: appRequest.data?.destination_coordinate, // TODO: set pickup
                destination: appRequest.data?.destination_coordinate,
              },
              user: appRequest.data?.user,
            },
          });
        })().catch((e) => {
          console.error(`ERROR: ${e}`);
        });
        timeoutId = window.setTimeout(polling, 10000);
      };
      polling();
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [accessToken, setClientChairPayloadWithStatus, isSSE]);

  const responseClientAppRequest = useMemo<ClientChairRide | undefined>(() => {
    const debugStatus =
      (searchParams.get("debug_status") as RideStatus) ?? undefined;
    const candidateAppRequest = { ...clientChairPayloadWithStatus };
    if (
      coordinate === undefined &&
      sessionStorage.getItem("latitude") &&
      sessionStorage.getItem("longitude")
    ) {
      SetCoordinate({
        latitude: Number(sessionStorage.getItem("latitude")),
        longitude: Number(sessionStorage.getItem("longitude")),
      });
    }
    if (debugStatus !== undefined) {
      candidateAppRequest.status = debugStatus;
      candidateAppRequest.payload = { ...candidateAppRequest.payload };
      candidateAppRequest.payload.ride_id = "__DUMMY_REQUEST_ID__";
      (candidateAppRequest.payload.user = {
        id: "1234",
        name: "ゆーざー",
      }),
        (candidateAppRequest.payload.coordinate = {
          ...candidateAppRequest.payload.coordinate,
        });
      candidateAppRequest.payload.coordinate.destination = {
        latitude: 34,
        longitude: 120,
      };
      if (coordinate === undefined) {
        SetCoordinate({
          longitude: 130,
          latitude: 40,
        });
      }
    }
    return {
      ...candidateAppRequest,
      status: candidateAppRequest.status,
      auth: {
        accessToken,
      },
      chair: {
        id,
        name: "ISUCON椅子",
        currentCoordinate: {
          setter: SetCoordinate,
          location: coordinate,
        },
      },
    };
  }, [
    clientChairPayloadWithStatus,
    searchParams,
    accessToken,
    id,
    coordinate,
    SetCoordinate,
  ]);
  return responseClientAppRequest;
};

const ClientChairRequestContext = createContext<Partial<ClientChairRide>>({});

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
    <ClientChairRequestContext.Provider value={{ ...request }}>
      {children}
    </ClientChairRequestContext.Provider>
  );
};

export const useClientChairRequestContext = () => {
  const context = useContext(ClientChairRequestContext);
  return context;
};
