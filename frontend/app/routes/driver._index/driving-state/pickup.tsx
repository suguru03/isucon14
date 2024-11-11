import { FC, useCallback } from "react";
import { fetchChairPostRideStatus } from "~/apiClient/apiComponents";
import { CarGreenIcon } from "~/components/icon/car-green";
import { CarRedIcon } from "~/components/icon/car-red";
import { LocationButton } from "~/components/modules/location-button/location-button";
import { Button } from "~/components/primitives/button/button";
import { Text } from "~/components/primitives/text/text";
import { useClientChairRequestContext } from "~/contexts/driver-context";

export const Pickup: FC = () => {
  const { auth, payload, status } = useClientChairRequestContext();

  const handleDeparture = useCallback(async () => {
    await fetchChairPostRideStatus({
      headers: {
        Authorization: `Bearer ${auth?.accessToken}`,
      },
      body: {
        status: "CARRYING",
      },
      pathParams: {
        rideId: payload?.ride_id ?? "",
      },
    });
  }, [auth, payload]);

  return (
    <>
      <div className="flex flex-col items-center my-8 gap-8">
        {status === "ENROUTE" && (
          <>
            <CarRedIcon className="size-[76px] mb-4" />
            <Text>
              <span className="font-bold mx-1">{payload?.user?.name}</span>
              さんの出発地点へ向かっています
            </Text>
          </>
        )}
        {status === "PICKUP" && (
          <>
            <CarGreenIcon className="size-[76px] mb-4" />
            <Text>
              <span className="font-bold mx-1">{payload?.user?.name}</span>
              さんの出発地点へ到着しました
            </Text>
          </>
        )}
        <div className="flex flex-col w-full items-center px-8">
          <LocationButton label="現在地" disabled className="w-full" />
          <Text size="xl">↓</Text>
          <LocationButton label="目的地" disabled className="w-full mb-4" />
          <Text variant="danger" size="sm">
            到着予定時間: 21:58
          </Text>
          {status === "PICKUP" && (
            <Button
              variant="primary"
              className="w-full mt-6"
              onClick={() => void handleDeparture()}
            >
              出発
            </Button>
          )}
        </div>
      </div>
    </>
  );
};
