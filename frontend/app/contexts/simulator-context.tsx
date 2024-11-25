import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Coordinate } from "~/apiClient/apiSchemas";
import { getOwners, getTargetChair } from "~/initialDataClient/getter";

import {
  ChairGetNotificationResponse,
  fetchChairGetNotification,
} from "~/apiClient/apiComponents";
import { apiBaseURL } from "~/apiClient/APIBaseURL";
import type { ClientChairRide } from "~/types";

export type SimulatorChair = {
  id: string;
  name: string;
  model: string;
  token: string;
  coordinateState: {
    coordinate?: Coordinate;
    setter: (coordinate: Coordinate) => void;
  };
  chairNotification?: ClientChairRide;
};

export type SimulatorOwner = {
  id: string;
  name: string;
  token: string;
  chair?: SimulatorChair;
};

type ClientSimulatorContextType = {
  owners: SimulatorOwner[];
  targetChair?: SimulatorChair;
};

const ClientSimulatorContext = createContext<ClientSimulatorContextType>({
  owners: [],
});

/**
 * SSE用の通信をfetchで取得した時のparse関数
 */
function getSSEJsonFromFetch<T>(value: string) {
  const data = value.slice("data:".length).trim();
  try {
    return JSON.parse(data) as T;
  } catch (e) {
    console.error(`don't parse ${value}`);
  }
}

export const useClientChairNotification = (id?: string) => {
  const [notification, setNotification] = useState<
    ChairGetNotificationResponse & { contentType: "event-stream" | "json" }
  >();
  useEffect(() => {
    const abortController = new AbortController();
    (async () => {
      const notification = await fetch(`${apiBaseURL}/chair/notification`);
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
          getSSEJsonFromFetch<ChairGetNotificationResponse["data"]>(decoded);
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
          | ChairGetNotificationResponse
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
    })().catch((e) => {
      console.error(`ERROR: ${JSON.stringify(e)}`);
    });
    return () => {
      abortController.abort();
    };
  }, [setNotification]);

  const clientChairPayloadWithStatus = useMemo(
    () =>
      notification
        ? {
            status: notification.data?.status,
            payload: {
              ride_id: notification.data?.ride_id,
              coordinate: {
                pickup: notification.data?.pickup_coordinate,
                destination: notification.data?.destination_coordinate,
              },
            },
          }
        : undefined,
    [notification],
  );
  const retryAfterMs = notification?.retry_after_ms ?? 10000;
  const isSSE = notification?.contentType === "event-stream";
  useEffect(() => {
    if (isSSE) {
      const eventSource = new EventSource(`${apiBaseURL}/chair/notification`);
      eventSource.addEventListener("message", (event) => {
        if (typeof event.data === "string") {
          const eventData = JSON.parse(
            event.data,
          ) as ChairGetNotificationResponse["data"];
          setNotification((preRequest) => {
            if (
              preRequest === undefined ||
              eventData?.status !== preRequest.data?.status ||
              eventData?.ride_id !== preRequest.data?.ride_id
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
    } else {
      const abortController = new AbortController();
      let timeoutId: number = 0;
      const polling = () => {
        (async () => {
          const currentNotification = await fetchChairGetNotification(
            {},
            abortController.signal,
          );
          setNotification((preRequest) => {
            if (
              preRequest === undefined ||
              currentNotification?.data?.status !== preRequest.data?.status ||
              currentNotification?.data?.ride_id !== preRequest.data?.ride_id
            ) {
              return {
                data: currentNotification.data,
                retry_after_ms: currentNotification.retry_after_ms,
                contentType: "json",
              };
            } else {
              return preRequest;
            }
          });
          timeoutId = window.setTimeout(polling, retryAfterMs);
        })().catch((e) => {
          console.error(`ERROR: ${JSON.stringify(e)}`);
        });
      };
      timeoutId = window.setTimeout(polling, retryAfterMs);

      return () => {
        abortController.abort();
        clearTimeout(timeoutId);
      };
    }
  }, [isSSE, retryAfterMs]);

  const responseClientAppRequest = useMemo<ClientChairRide | undefined>(() => {
    const candidateAppRequest = clientChairPayloadWithStatus;
    return {
      ...candidateAppRequest,
      status: candidateAppRequest?.status,
      user: {
        id,
        name: "ISUCON太郎",
      },
    };
  }, [clientChairPayloadWithStatus, id]);

  return responseClientAppRequest;
};

export const SimulatorProvider = ({ children }: { children: ReactNode }) => {
  const { id, token } = getTargetChair();
  useEffect(() => {
    document.cookie = `chair_session=${token}; path=/`;
  }, [token]);

  const owners = getOwners().map(
    (owner) =>
      ({
        ...owner,
        chair: {
          ...owner.chair,
          coordinateState: {
            setter(coordinate) {
              console.log("setter", coordinate);
              this.coordinate = coordinate;
            },
          },
          chairNotification: undefined,
        } satisfies SimulatorChair,
      }) satisfies SimulatorOwner,
  );

  const request = useClientChairNotification(id);
  const [currentCoodinate, setCurrentCoordinate] = useState<Coordinate>();

  return (
    <ClientSimulatorContext.Provider
      value={{
        owners,
        targetChair: {
          ...getTargetChair(),
          chairNotification: request,
          coordinateState: {
            setter: setCurrentCoordinate,
            coordinate: currentCoodinate,
          },
        },
      }}
    >
      {children}
    </ClientSimulatorContext.Provider>
  );
};

export const useSimulatorContext = () => useContext(ClientSimulatorContext);
