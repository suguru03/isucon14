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
  const [firstNotification, setFirstNotification] = useState<
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
        setFirstNotification(
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
        setFirstNotification(
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
  }, [setFirstNotification]);

  const [clientAppPayloadWithStatus, setClientAppPayloadWithStatus] = useState<
    Omit<ClientChairRide, "auth" | "user">
  >(
    firstNotification
      ? {
          status: firstNotification.data?.status,
          payload: {
            ride_id: firstNotification.data?.ride_id,
            coordinate: {
              pickup: firstNotification.data?.pickup_coordinate,
              destination: firstNotification.data?.destination_coordinate,
            },
          },
        }
      : {},
  );
  const retryAfterMs = firstNotification?.retry_after_ms ?? 10000;
  const isSSE = firstNotification?.contentType === "event-stream";
  useEffect(() => {
    if (isSSE) {
      const eventSource = new EventSource(`${apiBaseURL}/chair/notification`);
      eventSource.addEventListener("message", (event) => {
        if (typeof event.data === "string") {
          const eventData = JSON.parse(
            event.data,
          ) as ChairGetNotificationResponse;
          setClientAppPayloadWithStatus((preRequest) => {
            if (
              preRequest === undefined ||
              eventData.data?.status !== preRequest.status ||
              eventData.data?.ride_id !== preRequest.payload?.ride_id
            ) {
              return {
                status: eventData.data?.status,
                payload: {
                  ride_id: eventData.data?.ride_id,
                  coordinate: {
                    pickup: eventData.data?.pickup_coordinate,
                    destination: eventData.data?.destination_coordinate,
                  },
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
          setClientAppPayloadWithStatus((prev) => {
            if (
              prev?.payload !== undefined &&
              prev?.status === currentNotification.data?.status &&
              prev.payload?.ride_id === currentNotification.data?.ride_id
            ) {
              return prev;
            }

            return {
              status: currentNotification.data?.status,
              payload: {
                ride_id: currentNotification.data?.ride_id,
                coordinate: {
                  pickup: currentNotification.data?.pickup_coordinate,
                  destination: currentNotification.data?.destination_coordinate,
                },
              },
            };
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
  }, [setClientAppPayloadWithStatus, isSSE, retryAfterMs]);

  const responseClientAppRequest = useMemo<ClientChairRide | undefined>(() => {
    const candidateAppRequest = clientAppPayloadWithStatus;
    return {
      ...candidateAppRequest,
      status: candidateAppRequest?.status,
      user: {
        id,
        name: "ISUCON太郎",
      },
    };
  }, [clientAppPayloadWithStatus, id]);

  return responseClientAppRequest;
};

export const SimulatorProvider = ({ children }: { children: ReactNode }) => {
  const {id, token} = getTargetChair();
  useEffect(() => {
    document.cookie = `chair_session=${token}; path=/`;
  },[token])

  const owners = getOwners().map(
    (owner) =>
      ({
        ...owner,
        chair: {
          ...owner.chair,
          coordinateState: {
            setter(coordinate) {
              this.coordinate = coordinate;
            },
          },
          chairNotification: undefined,
        } satisfies SimulatorChair,
      }) satisfies SimulatorOwner,
  );

  const request = useClientChairNotification(id);

  return (
    <ClientSimulatorContext.Provider
      value={{
        owners,
        targetChair: {
          ...getTargetChair(),
          chairNotification: request,
          coordinateState: {
            setter(coordinate) {
              this.coordinate = coordinate;
            },
          },
        },
      }}
    >
      {children}
    </ClientSimulatorContext.Provider>
  );
};

export const useSimulatorContext = () => useContext(ClientSimulatorContext);
