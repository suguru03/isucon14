import { FC, memo, useCallback, useMemo, useRef, useState } from "react";
import colors from "tailwindcss/colors";
import { fetchChairPostActivity } from "~/api/api-components";
import { RideStatus } from "~/api/api-schemas";
import { useEmulator } from "~/components/hooks/use-emulate";
import { ChairIcon } from "~/components/icon/chair";
import { PinIcon } from "~/components/icon/pin";
import { LocationButton } from "~/components/modules/location-button/location-button";
import { Map } from "~/components/modules/map/map";
import { Button } from "~/components/primitives/button/button";
import { Toggle } from "~/components/primitives/form/toggle";
import { Modal } from "~/components/primitives/modal/modal";
import { Text } from "~/components/primitives/text/text";
import { useSimulatorContext } from "~/contexts/simulator-context";
import { Coordinate, SimulatorChair } from "~/types";
import { isArrayIncludes } from "~/utils/includes";
import { SimulatorChairRideStatus } from "../simulator-chair-status/simulator-chair-status";
import { getSimulatorStartCoordinate } from "~/utils/storage";
import { twMerge } from "tailwind-merge";

const CoordinatePickup: FC<{
  coordinateState: SimulatorChair["coordinateState"];
}> = ({ coordinateState }) => {
  const [initialMapLocation, setInitialMapLocation] = useState<Coordinate>();
  const [mapLocation, setMapLocation] = useState<Coordinate>();
  const [visibleModal, setVisibleModal] = useState<boolean>(false);
  const modalRef = useRef<HTMLElement & { close: () => void }>(null);

  const handleOpenModal = useCallback(() => {
    setInitialMapLocation(coordinateState.coordinate);
    setVisibleModal(true);
  }, [coordinateState]);

  const handleCloseModal = useCallback(() => {
    if (mapLocation) {
      coordinateState.setter(mapLocation);
    }

    modalRef.current?.close();
    setVisibleModal(false);
  }, [mapLocation, coordinateState]);

  return (
    <>
      <LocationButton
        className="w-full text-right"
        location={coordinateState.coordinate}
        label="椅子位置"
        placeholder="現在位置を設定"
        onClick={handleOpenModal}
      />
      {visibleModal && (
        <div className="fixed inset-0 z-10">
          <Modal
            ref={modalRef}
            center
            onClose={handleCloseModal}
            className="absolute w-full max-w-[800px] max-h-none h-[700px]"
          >
            <div className="w-full h-full flex flex-col items-center">
              <Map
                className="flex-1"
                initialCoordinate={initialMapLocation}
                from={initialMapLocation}
                onMove={(c) => setMapLocation(c)}
                selectable
              />
              <Button
                className="w-full mt-6"
                onClick={handleCloseModal}
                variant="primary"
              >
                この位置で確定する
              </Button>
            </div>
          </Modal>
        </div>
      )}
    </>
  );
};

const SimulatorProgress: FC<{
  model: string;
  rideStatus: RideStatus | undefined;
  current: Coordinate | undefined;
  pickup?: Coordinate;
  destlocation?: Coordinate;
}> = ({ model, rideStatus, pickup, destlocation, current }) => {
  const startCoordinate = useMemo(() => {
    return rideStatus !== undefined ? getSimulatorStartCoordinate() : null;
  }, [rideStatus]);

  const pickupProgress: number = useMemo(() => {
    if (
      rideStatus === "MATCHING" ||
      !rideStatus ||
      !pickup ||
      !startCoordinate ||
      !current
    )
      return 0;
    if (
      rideStatus === "PICKUP" ||
      rideStatus === "ARRIVED" ||
      rideStatus === "CARRYING" ||
      rideStatus === "COMPLETED"
    )
      return 100;
    const distance =
      Math.abs(pickup?.latitude - startCoordinate.latitude) +
      Math.abs(pickup?.longitude - startCoordinate.longitude);
    const progress =
      Math.abs(pickup?.latitude - current?.latitude) +
      Math.abs(pickup?.longitude - current.longitude);
    return Math.floor(((distance - progress) / distance) * 100);
  }, [rideStatus, pickup, current, startCoordinate]);

  const distanceProgress: number = useMemo(() => {
    if (
      rideStatus === "MATCHING" ||
      rideStatus === "PICKUP" ||
      rideStatus === "ENROUTE" ||
      !rideStatus ||
      !destlocation ||
      !pickup ||
      !current
    )
      return 0;
    if (rideStatus === "ARRIVED" || rideStatus === "COMPLETED") return 100;
    const distance =
      Math.abs(destlocation?.latitude - pickup.latitude) +
      Math.abs(destlocation?.longitude - pickup.longitude);
    const progress =
      Math.abs(destlocation?.latitude - current.latitude) +
      Math.abs(destlocation?.longitude - current.longitude);
    return Math.floor(((distance - progress) / distance) * 100);
  }, [rideStatus, pickup, destlocation, current]);

  return (
    <div className="flex items-center mt-8">
      <div className="flex border-b ms-6 pb-1 w-full">
        <div className="flex w-1/2">
          <PinIcon color={colors.red[500]} width={20} height={20} />
          <div className="relative w-full ms-6">
            {isArrayIncludes(
              [
                "PICKUP",
                "CARRYING",
                "ARRIVED",
                "COMPLETED",
              ] as const satisfies RideStatus[],
              rideStatus,
            ) && (
              <ChairIcon
                model={model}
                className={`size-6 absolute top-[-2px] ${rideStatus === "CARRYING" ? "animate-shake" : ""}`}
                style={{ right: `${distanceProgress}%` }}
              />
            )}
          </div>
        </div>
        <div className="flex w-1/2">
          <PinIcon color={colors.black} width={20} height={20} />
          <div className="relative w-full ms-6">
            {isArrayIncludes(
              ["MATCHING", "ENROUTE"] as const satisfies RideStatus[],
              rideStatus,
            ) && (
              <ChairIcon
                model={model}
                className={twMerge(
                  "size-6 absolute top-[-2px]",
                  rideStatus === "ENROUTE" && "animate-shake",
                )}
                style={{ right: `${pickupProgress}%` }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export const SimulatorChairDisplay: FC = () => {
  const { targetChair: chair } = useSimulatorContext();
  const [activate, setActivate] = useState<boolean>(true);

  const toggleActivate = useCallback(
    (activity: boolean) => {
      try {
        void fetchChairPostActivity({ body: { is_active: activity } });
        setActivate(activity);
      } catch (error) {
        console.error(error);
      }
    },
    [setActivate],
  );

  const rideStatus = useMemo(
    () => chair?.chairNotification?.status ?? "MATCHING",
    [chair],
  );

  useEmulator(chair);

  const ChairDetailInfo = memo(
    function ChairDetailInfo({
      chairModel,
      chairName,
      rideStatus,
    }: {
      chairModel: string;
      chairName: string;
      rideStatus: RideStatus;
    }) {
      return chairModel && chairName && rideStatus ? (
        <div className="flex items-center space-x-4">
          <ChairIcon model={chairModel} className="size-12 shrink-0" />
          <div className="space-y-0.5 w-full">
            <Text bold>{chairName}</Text>
            <Text className="text-xs text-neutral-500">{chairModel}</Text>
            <SimulatorChairRideStatus currentStatus={rideStatus} />
          </div>
        </div>
      ) : null;
    },
    (prev, next) =>
      prev.chairModel === next.chairModel &&
      prev.chairName === next.chairName &&
      prev.rideStatus === next.rideStatus,
  );

  return (
    <>
      <div className="bg-white rounded shadow px-6 py-4 w-full">
        {chair ? (
          <div className="space-y-4">
            <ChairDetailInfo
              chairModel={chair.model}
              chairName={chair.name}
              rideStatus={rideStatus}
            />
            <CoordinatePickup coordinateState={chair.coordinateState} />
            <SimulatorProgress
              model={chair.model}
              rideStatus={rideStatus}
              current={chair.coordinateState.coordinate}
              pickup={chair.chairNotification?.payload?.coordinate?.pickup}
              destlocation={
                chair.chairNotification?.payload?.coordinate?.destination
              }
            />
          </div>
        ) : (
          <Text className="m-4" size="sm">
            椅子のデータがありません
          </Text>
        )}
      </div>
      {chair && (
        <div className="bg-white rounded shadow px-6 py-4 w-full">
          <div className="flex justify-between items-center">
            <Text size="sm" className="text-neutral-500" bold>
              配車を受け付ける
            </Text>
            <Toggle
              checked={activate}
              onUpdate={(v) => toggleActivate(v)}
              id="chair-activity"
            />
          </div>
        </div>
      )}
    </>
  );
};
