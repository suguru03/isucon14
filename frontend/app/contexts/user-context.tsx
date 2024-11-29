import { useNavigate, useSearchParams } from "@remix-run/react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiBaseURL } from "~/apiClient/APIBaseURL";
import {
  AppGetNotificationResponse,
  fetchAppGetNotification,
} from "~/apiClient/apiComponents";
import type { Coordinate, RideStatus } from "~/apiClient/apiSchemas";
import { isClientApiError, type ClientAppRide } from "~/types";
import { getCookieValue } from "~/utils/get-cookie-value";

/**
 * SSE用の通信をfetchで取得した時用のparse関数
 */
function getSSEJsonFromFetch<T>(value: string) {
  const data = value.slice("data:".length).trim();
  try {
    return JSON.parse(data) as T;
  } catch (e) {
    console.error(`don't parse ${value}`);
  }
}

export const useClientAppRequest = (accessToken: string, id?: string) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [notification, setNotification] = useState<
    AppGetNotificationResponse & { contentType: "event-stream" | "json" }
  >();
  useEffect(() => {
    const abortController = new AbortController();
    try {
      void (async () => {
        const notification = await fetch(`${apiBaseURL}/app/notification`, {
          signal: abortController.signal,
        });
        if (notification.status === 401) {
          navigate("/client/register");
        }
        if (
          notification?.headers
            .get("Content-type")
            ?.split(";")[0]
            .includes("text/event-stream")
        ) {
          const reader = notification.body?.getReader();
          const decoder = new TextDecoder();
          const readed = (await reader?.read())?.value;
          const decoded = decoder.decode(readed);
          const json =
            getSSEJsonFromFetch<AppGetNotificationResponse["data"]>(decoded);
          setNotification(
            json
              ? {
                  data: json,
                  contentType: "event-stream",
                }
              : undefined,
          );
        } else {
          const json = (await notification.json()) as
            | AppGetNotificationResponse
            | undefined;
          setNotification(
            json
              ? {
                  ...json,
                  contentType: "json",
                }
              : undefined,
          );
        }
      })();
    } catch (e) {
      console.error(`ERROR: ${e as string}`);
    }
    return () => {
      abortController.abort();
    };
  }, [setNotification, navigate]);
  const clientAppPayloadWithStatus = useMemo(
    () =>
      notification?.data
        ? {
            status: notification.data?.status,
            payload: {
              ride_id: notification.data?.ride_id,
              coordinate: {
                pickup: notification.data?.pickup_coordinate,
                destination: notification.data?.destination_coordinate,
              },
              chair: notification.data?.chair,
              fare: notification.data.fare,
            },
          }
        : undefined,
    [notification],
  );
  const retryAfterMs = notification?.retry_after_ms ?? 10000;
  const isSSE = notification?.contentType === "event-stream";

  useEffect(() => {
    if (!isSSE) return;
    const eventSource = new EventSource(`${apiBaseURL}/app/notification`);
    eventSource.addEventListener("message", (event) => {
      if (typeof event.data === "string") {
        const eventData = JSON.parse(
          event.data,
        ) as AppGetNotificationResponse["data"];
        setNotification((preRequest) => {
          if (
            preRequest === undefined ||
            eventData?.status !== preRequest?.data?.status ||
            eventData?.ride_id !== preRequest?.data?.ride_id
          ) {
            return {
              data: eventData,
              contentType: "event-stream",
            };
          } else {
            return preRequest;
          }
        });
      }
      return () => {
        eventSource.close();
      };
    });
  }, [isSSE, setNotification]);

  useEffect(() => {
    if (isSSE) return;
    let timeoutId: number;
    let abortController: AbortController | undefined;
    const polling = () => {
      (async () => {
        const abortController = new AbortController();
        const currentNotification = await fetchAppGetNotification(
          {},
          abortController.signal,
        );
        setNotification((prev) => {
          if (
            prev?.data === undefined ||
            prev?.data?.status !== currentNotification.data?.status ||
            prev?.data?.ride_id !== currentNotification.data?.ride_id
          ) {
            return { ...currentNotification, contentType: "json" };
          } else {
            return prev;
          }
        });
        timeoutId = window.setTimeout(polling, retryAfterMs);
      })().catch((error) => {
        if (isClientApiError(error)) {
          console.error(error.message);
        }
      });
    };
    timeoutId = window.setTimeout(polling, retryAfterMs);

    return () => {
      abortController?.abort();
      clearTimeout(timeoutId);
    };
  }, [accessToken, isSSE, navigate, retryAfterMs]);

  const responseClientAppRequest = useMemo<ClientAppRide | undefined>(() => {
    const debugStatus =
      (searchParams.get("debug_status") as RideStatus) ?? undefined;
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

const ClientAppRequestContext = createContext<Partial<ClientAppRide>>({});

export const UserProvider = ({ children }: { children: ReactNode }) => {
  // TODO:
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

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

  useEffect(() => {
    if (getCookieValue(document.cookie, "app_session") === undefined) {
      navigate("/client/register");
    }
  }, [navigate]);

  const request = useClientAppRequest(accessToken ?? "", id ?? "");
  return (
    <ClientAppRequestContext.Provider value={{ ...request }}>
      {children}
    </ClientAppRequestContext.Provider>
  );
};

export const useClientAppRequestContext = () =>
  useContext(ClientAppRequestContext);
