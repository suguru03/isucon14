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
import { getCookieValue } from "~/utils/cookie-value";
import {
  getUserAccessToken,
  getUserId,
  setUserAccessToken,
  setUserId,
} from "~/utils/storage";

/**
 * SSE用の通信をfetchで取得した時用のparse関数
 */
function jsonFromSSEResponse<T>(value: string) {
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
    const run = async () => {
      try {
        const notification = await fetch(`${apiBaseURL}/app/notification`);
        if (notification.status === 401) {
          navigate("/client/register");
        }

        const isSSE = notification?.headers
          .get("Content-type")
          ?.split(";")[0]
          .includes("text/event-stream");
        if (isSSE) {
          const reader = notification.body?.getReader();
          const decoder = new TextDecoder();
          const readed = (await reader?.read())?.value;
          const decoded = decoder.decode(readed);
          const json =
            jsonFromSSEResponse<AppGetNotificationResponse["data"]>(decoded);
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
      } catch (error) {
        console.error(error);
      }
    };
    void run();
  }, [navigate]);

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
    let timeoutId: ReturnType<typeof setTimeout>;
    let abortController: AbortController | undefined;

    const polling = async () => {
      try {
        abortController = new AbortController();
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
        timeoutId = setTimeout(() => void polling(), retryAfterMs);
      } catch (error) {
        if (isClientApiError(error)) {
          console.error(error.message);
        }
      }
    };
    timeoutId = setTimeout(() => void polling(), retryAfterMs);
    return () => {
      abortController?.abort();
      clearTimeout(timeoutId);
    };
  }, [accessToken, isSSE, navigate, retryAfterMs]);

  // TODO: 後で消す
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
    // TODO: これ何やっている? useMemoの中では値をいれないようにする
    if (accessTokenParameter !== null && userIdParameter !== null) {
      requestIdleCallback(() => {
        setUserAccessToken(accessTokenParameter);
        setUserId(userIdParameter);
      });
      return {
        accessToken: accessTokenParameter,
        id: userIdParameter,
      };
    }
    const accessToken = getUserAccessToken() ?? undefined;
    const id = getUserId() ?? undefined;
    return {
      accessToken,
      id,
    };
  }, [accessTokenParameter, userIdParameter]);

  useEffect(() => {
    const isRegistered =
      typeof getCookieValue(document.cookie, "app_session") !== "undefined";
    if (!isRegistered) {
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

export const useUserContext = () => useContext(ClientAppRequestContext);
