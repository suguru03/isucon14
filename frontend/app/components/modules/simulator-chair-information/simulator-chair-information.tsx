import {
  ComponentProps,
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { twMerge } from "tailwind-merge";
import colors from "tailwindcss/colors";
import { fetchChairPostActivity } from "~/apiClient/apiComponents";

import { RideStatus } from "~/apiClient/apiSchemas";
import { ChairIcon } from "~/components/icon/chair";
import { PinIcon } from "~/components/icon/pin";
import { LocationButton } from "~/components/modules/location-button/location-button";
import { Map } from "~/components/modules/map/map";
import { Button } from "~/components/primitives/button/button";
import { Toggle } from "~/components/primitives/form/toggle";
import { Modal } from "~/components/primitives/modal/modal";
import { Coordinate, SimulatorChair } from "~/types";

const LabelStyleList = {
  MATCHING: ["空車", "text-sky-600"],
  ENROUTE: ["迎車", "text-amber-600"],
  PICKUP: ["乗車待ち", "text-amber-600"],
  CARRYING: ["賃走", "text-red-600"],
  ARRIVED: ["到着", "text-green-600"],
  COMPLETED: ["完了", "text-green-600"],
} as const;

const StatusList: FC<
  ComponentProps<"div"> & {
    currentStatus: RideStatus;
  }
> = ({ currentStatus, className, ...props }) => {
  const [labelName, colorClass] = LabelStyleList[currentStatus];
  return (
    <div className={twMerge(`font-bold ${colorClass}`, className)} {...props}>
      <span className="before:content-['●'] before:mr-2">{labelName}</span>
    </div>
  );
};

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
        className="w-full"
        location={coordinateState.coordinate}
        label="椅子位置"
        placeholder="現在位置を設定"
        onClick={handleOpenModal}
      />
      {visibleModal && (
        <div className="fixed min-w-[1200px] min-h-[1000px] inset-0">
          <Modal
            ref={modalRef}
            center
            onClose={handleCloseModal}
            className="absolute w-[800px] md:max-w-none max-h-none h-[700px]"
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

export const SimulatorChairInformation: FC<{ chair: SimulatorChair }> = ({
  chair,
}) => {
  const [activate, setActivate] = useState<boolean>(true);
  const [progress, setProgress] = useState<{
    pickup: number;
    destlocation: number;
  }>({
    pickup: 0,
    destlocation: 0,
  });

  // TODO: 仮実装
  useEffect(() => {
    let _progress = 0;
    setInterval(() => {
      _progress = (_progress + 0.1) % 2;
      setProgress({
        pickup: Math.max(_progress - 1, 0),
        destlocation: Math.max(_progress - 1, 0),
      });
    }, 1000);
  }, []);

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
    () => chair.chairNotification?.status ?? "MATCHING",
    [chair],
  );

  return (
    <>
      <div className="px-4 py-4">
        <div className="flex items-center">
          <div className="flex-1 me-2 overflow-hidden">
            <p className="truncate">{chair.name}</p>
            <p className="text-sm text-gray-500 truncate mt-1">{chair.model}</p>
          </div>
          <div className="flex items-center shrink-0">
            <span className="text-xs text-gray-500 mr-2">配車受付</span>
            <Toggle value={activate} onUpdate={(v) => toggleActivate(v)} />
          </div>
        </div>

        <div className="flex justify-end mt-10">
          <div className="w-2/3 z-10">
            <CoordinatePickup coordinateState={chair.coordinateState} />
          </div>
        </div>

        <div className="flex items-center mt-8">
          <StatusList className="shrink-0" currentStatus={rideStatus} />
          {/* Progress */}
          <div className="flex border-b ms-6 pb-1 w-full">
            {/* PICKUP -> ARRIVED */}
            <div className="flex w-1/2">
              <PinIcon color={colors.red[500]} width={20} height={20} />
              {/* road */}
              <div className="relative w-full ms-6">
                {(
                  ["CARRYING", "ARRIVED", "COMPLETED"] as RideStatus[]
                ).includes(rideStatus) && (
                  <ChairIcon
                    model={chair.model}
                    className={`size-6 absolute top-[-2px] ${rideStatus === "CARRYING" ? "animate-shake" : ""}`}
                    style={{ right: `${progress.destlocation * 100}%` }}
                  />
                )}
              </div>
            </div>
            {/* ENROUTE -> PICKUP */}
            <div className="flex w-1/2">
              <PinIcon color={colors.black} width={20} height={20} />
              {/* road */}
              <div className="relative w-full ms-6">
                {(["MATCHING", "ENROUTE", "PICKUP"] as RideStatus[]).includes(
                  rideStatus,
                ) && (
                  <ChairIcon
                    model={chair.model}
                    className={`size-6 absolute top-[-2px] ${rideStatus === "ENROUTE" ? "animate-shake" : ""}`}
                    style={{ right: `${progress.pickup * 100}%` }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
