import { useNavigate, useSearchParams } from "@remix-run/react";
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
import { fetchAppGetNotification } from "~/apiClient/apiComponents";
import type {
  AppRequest,
  Coordinate,
  RequestStatus,
} from "~/apiClient/apiSchemas";
import type { ClientAppRequest } from "~/types";

const isApiFetchError = (
  obj: any,
): obj is {
  name: string;
  message: string;
  stack: {
    status: number;
    payload: string;
  };
} =>
  typeof obj?.name === "string" &&
  typeof obj?.message === "string" &&
  typeof obj?.stack?.status === "number" &&
  typeof obj?.stack?.payload === "string";

export const useClientAppRequest = (accessToken: string, id?: string) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [clientAppPayloadWithStatus, setClientAppPayloadWithStatus] =
    useState<Omit<ClientAppRequest, "auth" | "user">>();
  const isSSE = localStorage.getItem("isSSE") === "true";

  useEffect(() => {
    if (isSSE) {
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
          setClientAppPayloadWithStatus((preRequest) => {
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
    } else {
      const abortController = new AbortController();

      const polling = () => {
        (async () => {
          const current = await fetchAppGetNotification(
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            },
            abortController.signal,
          );
          setClientAppPayloadWithStatus((prev) => {
            if (
              prev?.payload !== undefined &&
              prev?.status === current.status &&
              prev.payload?.request_id === current.request_id
            ) {
              return prev;
            }

            return {
              status: current.status,
              payload: {
                request_id: current.request_id,
                coordinate: {
                  pickup: current.pickup_coordinate,
                  destination: current.destination_coordinate,
                },
                chair: current.chair,
              },
            };
          });
        })().catch((e) => {
          console.error(`ERROR: ${e}`);
        });
        window.setTimeout(polling, 10000);
      };
      polling();

      (async () => {
        const appRequest = await fetchAppGetNotification(
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
          abortController.signal,
        );
        setClientAppPayloadWithStatus({
          status: appRequest.status,
          payload: {
            request_id: appRequest.request_id,
            coordinate: {
              pickup: appRequest.pickup_coordinate,
              destination: appRequest.destination_coordinate,
            },
            chair: appRequest.chair,
          },
        });
      })().catch((e) => {
        if (isApiFetchError(e)) {
          const apiError = e as {
            name: string;
            message: string;
            stack: {
              status: number;
              payload: string;
            };
          };
          if (apiError.stack.status === 401) {
            navigate("/client/register");
          }
        }
        console.error(`ERROR: ${JSON.stringify(e)}`);
      });
    }
  }, [accessToken, setClientAppPayloadWithStatus, isSSE, navigate]);

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
    const candidateAppRequest = clientAppPayloadWithStatus;
    if (
      debugDestinationCoordinate &&
      candidateAppRequest?.payload?.coordinate
    ) {
      candidateAppRequest.payload.coordinate.destination =
        debugDestinationCoordinate;
    }
    return {
      ...candidateAppRequest,
      status: debugStatus ?? candidateAppRequest?.status,
      auth: {
        accessToken,
      },
      user: {
        id,
        name: "ISUCON太郎",
      },
    };
  }, [clientAppPayloadWithStatus, searchParams, accessToken, id]);

  return responseClientAppRequest;
};

const ClientAppRequestContext = createContext<Partial<ClientAppRequest>>({});

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

  const request = useClientAppRequest(accessToken ?? "", id ?? "");

  return (
    <ClientAppRequestContext.Provider value={{ ...request }}>
      {children}
    </ClientAppRequestContext.Provider>
  );
};

export const useClientAppRequestContext = () =>
  useContext(ClientAppRequestContext);
