import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Coordinate } from "~/apiClient/apiSchemas";
import { getOwners, getSimulateChair } from "~/utils/get-initial-data";

import { apiBaseURL } from "~/apiClient/APIBaseURL";
import {
  ChairGetNotificationResponse,
  fetchChairGetNotification,
} from "~/apiClient/apiComponents";
import type { ClientChairRide, SimulatorChair, SimulatorOwner } from "~/types";

type ClientSimulatorContextProps = {
  owners: SimulatorOwner[];
  targetChair?: SimulatorChair;
};

const ClientSimulatorContext = createContext<ClientSimulatorContextProps>({
  owners: [],
});

function jsonFromSseResult<T>(value: string) {
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
          jsonFromSseResult<ChairGetNotificationResponse["data"]>(decoded);
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
      let timeoutId: ReturnType<typeof setTimeout>;
      let abortController: AbortController;

      const polling = () => {
        try {
          async () => {
            abortController = new AbortController();
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
            timeoutId = setTimeout(polling, retryAfterMs);
          };
        } catch (error) {
          console.error(error);
        }
      };

      polling();

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

const simulateChairData = getSimulateChair();

export const SimulatorProvider = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    if (simulateChairData?.token) {
      document.cookie = `chair_session=${simulateChairData.token}; path=/`;
    }
  }, []);

  const owners = useMemo(
    () =>
      getOwners().map(
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
      ),
    [],
  );

  const request = useClientChairNotification(simulateChairData?.id);
  const [currentCoodinate, setCurrentCoordinate] = useState<Coordinate>();

  return (
    <ClientSimulatorContext.Provider
      value={{
        owners,
        targetChair: simulateChairData
          ? {
              ...simulateChairData,
              chairNotification: request,
              coordinateState: {
                setter: setCurrentCoordinate,
                coordinate: currentCoodinate,
              },
            }
          : undefined,
      }}
    >
      {children}
    </ClientSimulatorContext.Provider>
  );
};

export const useSimulatorContext = () => useContext(ClientSimulatorContext);
