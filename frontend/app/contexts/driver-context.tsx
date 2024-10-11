import { useSearchParams } from "@remix-run/react";
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  ChairRequest,
  RequestStatus,
  Coordinate,
} from "~/apiClient/apiSchemas";
import { EventSourcePolyfill } from "event-source-polyfill";
import { apiBaseURL } from "~/apiClient/APIBaseURL";
import { fetchChairGetNotification } from "~/apiClient/apiComponents";
import type { ClientChairRequest } from "~/types";

export const useClientChairRequest = (accessToken: string, id?: string) => {
  const [searchParams] = useSearchParams();
  const [clientChairPayloadWithStatus, setClientChairPayloadWithStatus] =
    useState<Omit<ClientChairRequest, "auth" | "chair">>();
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
        setTimeout(polling, 3000);
      };
      polling();
    }
  }, [accessToken, setClientChairPayloadWithStatus, isSSE]);

  const responseClientAppRequest = useMemo<
    ClientChairRequest | undefined
  >(() => {
    const debugStatus =
      (searchParams.get("debug_status") as RequestStatus) ?? undefined;
    const candidateAppRequest = clientChairPayloadWithStatus;
    if (debugStatus !== undefined && candidateAppRequest) {
      candidateAppRequest.status = debugStatus;
      candidateAppRequest.payload = { ...candidateAppRequest.payload };
      candidateAppRequest.payload.request_id = "__DUMMY_REQUEST_ID__";
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

const ClientChairRequestContext = createContext<Partial<ClientChairRequest>>(
  {},
);

export const DriverProvider = ({ children }: { children: ReactNode }) => {
  // TODO:
  const [searchParams] = useSearchParams();
  const accessTokenParameter = searchParams.get("access_token");
  const chairIdParameter = searchParams.get("id");
  const debugStatus =
    (searchParams.get("debug_status") as RequestStatus) ?? undefined;

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
    <ClientChairRequestContext.Provider
      value={{ ...request, status: debugStatus }}
    >
      {children}
    </ClientChairRequestContext.Provider>
  );
};

export const useClientChairRequestContext = () =>
  useContext(ClientChairRequestContext);
