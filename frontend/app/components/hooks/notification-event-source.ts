import { EventSourcePolyfill } from "event-source-polyfill";
import { useEffect, useState } from "react";
import { apiBaseURL } from "~/apiClient/APIBaseURL";
import { AppRequest, ChairRequest } from "~/apiClient/apiSchemas";

type InferRequest<T extends "app" | "chair"> = T extends "app"
  ? AppRequest
  : ChairRequest;
export const useNotificationEventSource = <T extends "app" | "chair">(
  target: T,
  accessToken: string,
) => {
  const [request, setRequest] = useState<InferRequest<T>>();
  useEffect(() => {
    /**
     * WebAPI標準のものはAuthヘッダーを利用できないため
     */
    const eventSource = new EventSourcePolyfill(
      `${apiBaseURL}/${target}/notification`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    eventSource.onmessage = (event) => {
      if (typeof event.data === "string") {
        const eventData = JSON.parse(event.data) as InferRequest<T>;
        setRequest((preRequest) => {
          if (
            eventData.status !== preRequest?.status ||
            eventData.request_id !== preRequest?.request_id
          ) {
            return eventData;
          } else {
            return preRequest;
          }
        });
      }
      return () => {
        eventSource.close();
      };
    };
  }, [target, accessToken, setRequest]);

  return { request };
};
