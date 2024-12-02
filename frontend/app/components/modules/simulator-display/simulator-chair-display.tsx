import { FC, useCallback, useMemo, useRef, useState } from "react";
import { fetchChairPostActivity } from "~/apiClient/apiComponents";
import { useEmulator } from "~/components/hooks/use-emulate";
import { ChairIcon } from "~/components/icon/chair";
import { LocationButton } from "~/components/modules/location-button/location-button";
import { Map } from "~/components/modules/map/map";
import { Button } from "~/components/primitives/button/button";
import { Toggle } from "~/components/primitives/form/toggle";
import { Modal } from "~/components/primitives/modal/modal";
import { Text } from "~/components/primitives/text/text";
import { useSimulatorContext } from "~/contexts/simulator-context";
import { Coordinate, SimulatorChair } from "~/types";
import { SimulatorChairRideStatus } from "../simulator-chair-status/simulator-chair-status";

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

  return (
    <>
      <div className="bg-white rounded shadow px-6 py-4 w-full">
        {chair ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <ChairIcon model={chair.model} className="size-12 shrink-0" />
              <div className="space-y-0.5 w-full">
                <Text bold>{chair.name}</Text>
                <Text className="text-xs text-neutral-500">{chair.model}</Text>
                <SimulatorChairRideStatus currentStatus={rideStatus} />
              </div>
            </div>
            <CoordinatePickup coordinateState={chair.coordinateState} />
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
