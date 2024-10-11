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
  const [onCloseFunction, setOncloseFunction] = useState<() => void>(() => {});
  useEffect(() => {
    onCloseFunction();
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
    setOncloseFunction(() => eventSource.close());
    eventSource.onmessage = (event) => {
      console.log("event", event);
      if (event.data === "") {
        return;
      }
      if (typeof event.data === "string") {
        const eventData = JSON.parse(event.data) as InferRequest<T>;
        if (
          eventData.status !== request?.status ||
          eventData.request_id !== request?.request_id
        ) {
          setRequest(eventData);
        }
      }
      return;
    };
  }, [target, accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  return { request, onCloseFunction };
};
