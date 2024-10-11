import { useRef, useState } from "react";
import { Coordinate } from "~/apiClient/apiSchemas";
import { CarRedIcon } from "~/components/icon/car-red";
import { LocationButton } from "~/components/modules/location-button/location-button";
import { Map } from "~/components/modules/map/map";
import { Button } from "~/components/primitives/button/button";
import { Modal } from "~/components/primitives/modal/modal";
import { Text } from "~/components/primitives/text/text";
import type { RequestProps } from "~/components/request/type";

type Action = "from" | "to";

export const Reception = ({
  status,
}: RequestProps<"IDLE" | "MATCHING" | "DISPATCHING">) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [action, setAction] = useState<Action>();
  const [selectLocation, setSelectLocation] = useState<Coordinate>();
  const [currentLocation, setCurrentLocation] = useState<Coordinate>();
  const [destLocation, setDestLocation] = useState<Coordinate>();
  const modalRef = useRef<{ close: () => void }>(null);

  const handleCloseModal = () => {
    if (modalRef.current) {
      modalRef.current.close();
    }
  };

  const onClose = () => {
    if (action === "from") setCurrentLocation(selectLocation);
    if (action === "to") setDestLocation(selectLocation);
    setSelectLocation(undefined);
    setIsModalOpen(false);
  };

  const onMove = (coordinate: Coordinate) => {
    setSelectLocation(coordinate);
  };

  const handleOpenModal = (action: Action) => {
    setIsModalOpen(true);
    setAction(action);
  };

  return (
    <>
      {status === "IDLE" ? (
        <>
          <Map />
          <div className="w-full px-8 py-8 flex flex-col items-center justify-center">
            <LocationButton
              className="w-full"
              location={currentLocation}
              onClick={() => handleOpenModal("from")}
              placeholder="現在地を選択する"
              label="from"
            />
            <Text size="xl">↓</Text>
            <LocationButton
              location={destLocation}
              className="w-full"
              onClick={() => handleOpenModal("to")}
              placeholder="目的地を選択する"
              label="to"
            />
            <Button
              variant="primary"
              className="w-full mt-6 font-bold"
              onClick={() => {}}
              disabled={!(Boolean(currentLocation) && Boolean(destLocation))}
            >
              ISURIDE
            </Button>
          </div>
        </>
      ) : (
        <div className="w-full h-full px-8 flex flex-col items-center justify-center">
          <CarRedIcon className="size-[76px] mb-4" />
          <Text size="xl" className="mb-6">
            配車しています
          </Text>
          <LocationButton
            label="from"
            className="w-full"
            onClick={() => handleOpenModal("from")}
          />
          <Text size="xl">↓</Text>
          <LocationButton
            label="to"
            location={{ latitude: 123, longitude: 456 }}
            className="w-full"
            onClick={() => handleOpenModal("to")}
          />
          <Button variant="danger" className="w-full mt-6" onClick={() => {}}>
            配車をキャンセルする
          </Button>
        </div>
      )}

      {isModalOpen && (
        <Modal ref={modalRef} onClose={onClose}>
          <div className="flex flex-col items-center mt-4 h-full">
            <div className="flex-grow w-full max-h-[75%] mb-6">
              <Map onMove={onMove} selectable />
            </div>
            <p className="font-bold mb-4 text-base">
              {action === "from" ? "現在地" : "目的地"}を選択してください
            </p>
            <Button onClick={handleCloseModal}>
              {action === "from"
                ? "この場所から移動する"
                : "この場所に移動する"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
};
