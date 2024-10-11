import { useCallback } from "react";
import { fetchChairPostRequestDepart } from "~/apiClient/apiComponents";
import { LocationButton } from "~/components/modules/location-button/location-button";
import { Button } from "~/components/primitives/button/button";
import { Text } from "~/components/primitives/text/text";
import type { RequestProps } from "~/components/request/type";
import { useClientChairRequestContext } from "~/contexts/driver-context";
import type { ClientChairRequest } from "~/types";

export const Pickup = ({
  status,
  payload,
}: RequestProps<
  "DISPATCHING" | "DISPATCHED" | "CARRYING",
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
      <div className="flex flex-col items-center my-8 gap-8">
        {status === "DISPATCHING" ? (
          <Text>
            <span className="font-bold mx-1">{payload?.user?.name}</span>
            さんの出発地点へ向かっています
          </Text>
        ) : status === "DISPATCHED" ? (
          <Text>
            <span className="font-bold mx-1">{payload?.user?.name}</span>
            さんの出発地点へ到着しました
          </Text>
        ) : (
          <Text>
            <span className="font-bold mx-1">{payload?.user?.name}</span>
            さんの配車依頼
          </Text>
        )}
        <div className="flex flex-col w-full items-center px-8">
          <LocationButton
            type="from"
            position="here"
            disabled
            className="w-full"
          />
          <Text size="xl">↓</Text>
          <LocationButton
            type="to"
            position="here"
            disabled
            className="w-full mb-4"
          />
          <Text variant="danger" size="sm">
            到着予定時間: 21:58
          </Text>
          {status === "DISPATCHED" ? (
            <Button
              variant="primary"
              className="w-full mt-6"
              onClick={() => void handleDeparture()}
            >
              出発
            </Button>
          ) : null}
        </div>
      </div>
    </>
  );
};
