import { ComponentProps, useCallback, useMemo, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { fetchChairPostActivity } from "~/apiClient/apiComponents";

import { RideStatus } from "~/apiClient/apiSchemas";
import { ChairIcon } from "~/components/icon/chair";
import { LocationButton } from "~/components/modules/location-button/location-button";
import { Map } from "~/components/modules/map/map";
import { Button } from "~/components/primitives/button/button";
import { Toggle } from "~/components/primitives/form/toggle";
import { Modal } from "~/components/primitives/modal/modal";
import { Coordinate, SimulatorChair } from "~/types";

type Props = {
  chair: SimulatorChair;
};

function Statuses(
  props: ComponentProps<"div"> & {
    currentStatus: RideStatus;
  },
) {
  const labelByStatus: Record<RideStatus, [label: string, colorClass: string]> =
    {
      MATCHING: ["空車", "text-sky-600"],
      ENROUTE: ["迎車", "text-amber-600"],
      PICKUP: ["乗車待ち", "text-amber-600"],
      CARRYING: ["賃走", "text-red-600"],
      ARRIVED: ["到着", "text-green-600"],
      COMPLETED: ["完了", "text-green-600"],
    } as const;

  const { currentStatus, className, ...rest } = props;
  const [label, colorClass] = labelByStatus[currentStatus];
  return (
    <div className={twMerge(`font-bold ${colorClass}`, className)} {...rest}>
      <span className="before:content-['●'] before:mr-2">{label}</span>
    </div>
  );
}

function CoordinatePickup({
  coordinateState,
}: {
  coordinateState: SimulatorChair["coordinateState"];
}) {
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
        label="設定位置"
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
}

export function ChairInfo(props: Props) {
  const { chair } = props;
  const [activate, setActivate] = useState<boolean>(true);

  const toggleActivate = useCallback(
    (activity: boolean) => {
      try {
        void fetchChairPostActivity({ body: { is_active: activity } });
        setActivate(activity);
      } catch (e) {
        if (typeof e === "string") {
          console.error(`CONSOLE ERROR: ${e}`);
        }
      }
    },
    [setActivate],
  );
  const rideStatus = useMemo(
    () => chair.chairNotification?.status ?? "MATCHING",
    [chair],
  );
  return (
    <div>
      <div className="flex">
        <ChairIcon model={props.chair.model} className="size-12 mx-3 my-auto" />
        <div className="right-container m-3 flex-grow">
          <div className="right-top flex">
            <div className="right-top-left flex-grow">
              <div className="chair-name font-bold">
                <span>{props.chair.name}</span>
                <span className="ml-1 text-xs font-normal text-neutral-500">
                  {props.chair.model}
                </span>
              </div>
              <Statuses className="my-2" currentStatus={rideStatus} />
            </div>
            <div className="right-top-right flex items-center">
              <span className="text-xs font-bold text-neutral-500 mr-3">
                配車受付
              </span>
              <Toggle value={activate} onUpdate={(v) => toggleActivate(v)} />
            </div>
          </div>
          <div className="right-bottom">
            <CoordinatePickup coordinateState={chair.coordinateState} />
          </div>
        </div>
      </div>
      <p className="text-xs px-2 mt-2">
        <span className="text-gray-500 me-1">Session ID:</span>
        {/* TODO: Session IDの表示 */}
        <span>xxxx</span>
      </p>
    </div>
  );
}
