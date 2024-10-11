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
  const [onCloseFunction, setOncloseFunction] = useState<() => void>();
  useEffect(() => {
    const eventSource = new EventSourcePolyfill(
      `${apiBaseURL}/${target}/notification`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    setOncloseFunction(() => eventSource.close());
    eventSource.onmessage = (event) => {
      console.log("event", event);
      if (event.data === "") {
        return;
      }
      const eventData = JSON.parse(event.data) as InferRequest<T>;
      if (
        eventData.status !== request?.status ||
        eventData.request_id !== request?.request_id
      ) {
        setRequest(eventData);
        return;
      }
    };
  }, []);

  return { request, onCloseFunction };
};
