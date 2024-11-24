import { useCallback, useRef } from "react";
import { useChairPostRideStatus } from "~/apiClient/apiComponents";
import { CarRedIcon } from "~/components/icon/car-red";
import { LocationButton } from "~/components/modules/location-button/location-button";
import { Button } from "~/components/primitives/button/button";
import { Text } from "~/components/primitives/text/text";
import { useClientChairRequestContext } from "~/contexts/driver-context";

export const Matching = ({
  name,
  ride_id,
}: {
  name?: string;
  ride_id?: string;
}) => {
  const { auth } = useClientChairRequestContext();
  const modalRef = useRef<{ close: () => void }>(null);
  const handleCloseModal = () => {
    if (modalRef.current) {
      modalRef.current.close();
    }
  };

  const { mutate: postChairRideStatus } = useChairPostRideStatus();

  const handleAccept = useCallback(() => {
    postChairRideStatus({
      pathParams: { rideId: ride_id || "" },
      body: {
        status: "ENROUTE",
      },
      headers: {
        Authorization: `Bearer ${auth?.accessToken}`,
      },
    });
  }, [auth, postChairRideStatus, ride_id]);

  return (
    <div className="h-full text-center content-center">
      <div className="flex flex-col items-center my-8 gap-8">
        <CarRedIcon className="size-[76px] mb-4" />

        <Text>
          <span className="font-bold mx-1">{name}</span>
          さんから配車要求が届いています
        </Text>

        <div className="w-full">
          <LocationButton label="現在地" disabled className="w-full" />
          <Text size="xl">↓</Text>
          <LocationButton label="目的地" disabled className="w-full mb-4" />
          <Text variant="danger" size="sm">
            到着予定時間: 21:58
          </Text>
        </div>

        <div>
          <div className="my-4">
            <Button
              variant="primary"
              className="w-80"
              onClick={() => {
                handleAccept();
                handleCloseModal();
              }}
            >
              配車を受け付ける
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
