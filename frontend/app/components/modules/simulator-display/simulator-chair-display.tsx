import { FC, memo, useCallback, useMemo, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import colors from "tailwindcss/colors";
import { RideStatus } from "~/api/api-schemas";
import { ChairIcon } from "~/components/icon/chair";
import { PinIcon } from "~/components/icon/pin";
import { LocationButton } from "~/components/modules/location-button/location-button";
import { Map } from "~/components/modules/map/map";
import { Button } from "~/components/primitives/button/button";
import { Modal } from "~/components/primitives/modal/modal";
import { Text } from "~/components/primitives/text/text";
import { useSimulatorContext } from "~/contexts/simulator-context";
import type { Coordinate } from "~/types";
import { getSimulatorStartCoordinate } from "~/utils/storage";
import { SimulatorChairRideStatus } from "../simulator-chair-status/simulator-chair-status";

const CoordinatePickup: FC<> = () => {
  const { chair, setCoordinate } = useSimulatorContext();
  const [initialMapLocation, setInitialMapLocation] = useState<Coordinate>();
  const [mapLocation, setMapLocation] = useState<Coordinate>();
  const [visibleModal, setVisibleModal] = useState<boolean>(false);
  const modalRef = useRef<HTMLElement & { close: () => void }>(null);

  const handleOpenModal = useCallback(() => {
    setInitialMapLocation(chair?.coordinate);
    setVisibleModal(true);
  }, [chair?.coordinate]);

  const handleCloseModal = useCallback(() => {
    if (mapLocation) {
      setCoordinate?.(mapLocation);
    }
    modalRef.current?.close();
    setVisibleModal(false);
  }, [mapLocation, setCoordinate]);

  return (
    <>
      <LocationButton
        className="w-full text-right"
        location={chair?.coordinate}
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

const progress = (
  start: Coordinate,
  current: Coordinate,
  end: Coordinate,
): number => {
  const distance =
    Math.abs(end.latitude - start.latitude) +
    Math.abs(end.longitude - start.longitude);
  const progress =
    Math.abs(end.latitude - current.latitude) +
    Math.abs(end.longitude - current.longitude);
  return Math.floor(((distance - progress) / distance) * 100);
};

const ChairProgress: FC<{
  model: string;
  rideStatus: RideStatus | undefined;
  currentLoc: Coordinate | undefined;
  pickupLoc?: Coordinate;
  destLoc?: Coordinate;
}> = ({ model, rideStatus, pickupLoc, destLoc, currentLoc }) => {
  const startLoc = useMemo(() => {
    return rideStatus !== undefined ? getSimulatorStartCoordinate() : null;
  }, [rideStatus]);

  const pickupProgress: number = useMemo(() => {
    if (!rideStatus || !pickupLoc || !startLoc || !currentLoc) {
      return 0;
    }
    switch (rideStatus) {
      case "MATCHING":
        return 0;
      case "PICKUP":
      case "ARRIVED":
      case "CARRYING":
      case "COMPLETED":
        return 100;
      default:
        return progress(startLoc, currentLoc, pickupLoc);
    }
  }, [rideStatus, pickupLoc, startLoc, currentLoc]);

  const distanceProgress: number = useMemo(() => {
    if (!rideStatus || !destLoc || !pickupLoc || !currentLoc) {
      return 0;
    }
    switch (rideStatus) {
      case "MATCHING":
      case "PICKUP":
      case "ENROUTE":
        return 0;
      case "ARRIVED":
      case "COMPLETED":
        return 100;
      default:
        return progress(destLoc, currentLoc, pickupLoc);
    }
  }, [rideStatus, destLoc, pickupLoc, currentLoc]);

  return (
    <div className="flex items-center">
      <div className="flex border-b pb-1 w-full">
        <div className="flex w-1/2">
          <PinIcon color={colors.red[500]} width={20} />
          <div className="relative w-full ms-6">
            {rideStatus &&
              ["PICKUP", "CARRYING", "ARRIVED", "COMPLETED"].includes(
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
          <PinIcon color={colors.black} width={20} />
          <div className="relative w-full ms-6">
            {rideStatus && ["MATCHING", "ENROUTE"].includes(rideStatus) && (
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
  const { data, chair } = useSimulatorContext();
  const rideStatus = useMemo(() => data?.status ?? "MATCHING", [data]);

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
    <div className="bg-white rounded shadow px-6 py-4 w-full">
      {chair ? (
        <div className="space-y-4">
          <ChairDetailInfo
            chairModel={chair.model}
            chairName={chair.name}
            rideStatus={rideStatus}
          />
          <CoordinatePickup />
          <ChairProgress
            model={chair.model}
            rideStatus={rideStatus}
            currentLoc={chair.coordinate}
            pickupLoc={data?.pickup_coordinate}
            destLoc={data?.destination_coordinate}
          />
        </div>
      ) : (
        <Text className="m-4" size="sm">
          椅子のデータがありません
        </Text>
      )}
    </div>
  );
};
