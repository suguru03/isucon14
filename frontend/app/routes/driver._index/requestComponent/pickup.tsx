import { useCallback } from "react";
import { fetchChairPostRequestDepart } from "~/apiClient/apiComponents";
import { Button } from "~/components/primitives/button/button";
import { Text } from "~/components/primitives/text/text";
import { useClientChairRequestContext } from "~/contexts/driver-context";
import type { RequestProps } from "~/components/request/type";
import type { ClientChairRequest } from "~/types";

export const Pickup = ({
  status,
  payload,
}: RequestProps<
  "DISPATCHING" | "DISPATCHED",
  { payload: ClientChairRequest["payload"] }
>) => {
  const { auth } = useClientChairRequestContext();

  const handleDeparture = useCallback(async () => {
    await fetchChairPostRequestDepart({
      headers: {
        Authorization: `Bearer ${auth?.accessToken}`,
      },
      pathParams: {
        requestId: payload?.request_id ?? "",
      },
    });
  }, [auth, payload]);

  return (
    <>
      <div className="h-full text-center content-center bg-blue-200">Map</div>
      <div className="flex flex-col items-center my-8 gap-8">
        {status === "DISPATCHING" ? (
          <Text>
            <span className="font-bold mx-1">{payload?.user?.name}</span>
            さんの出発地点へ向かっています
          </Text>
        ) : (
          <Text>
            <span className="font-bold mx-1">{payload?.user?.name}</span>
            さんの出発地点へ到着しました
          </Text>
        )}
        <p>{"from -> to"}</p>
        {status === "DISPATCHED" ? (
          <Button onClick={() => void handleDeparture()}>出発</Button>
        ) : null}
      </div>
    </>
  );
};
