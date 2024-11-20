import type { MetaFunction } from "@remix-run/node";
import { useNavigate } from "@remix-run/react";
import { useCallback, useRef, useState } from "react";
import { useChairPostActivity } from "~/apiClient/apiComponents";
import { useEmulator } from "~/components/hooks/emulate";
import { LocationButton } from "~/components/modules/location-button/location-button";
import { Map } from "~/components/modules/map/map";
import { Button } from "~/components/primitives/button/button";
import { Modal } from "~/components/primitives/modal/modal";
import { useClientChairRequestContext } from "~/contexts/driver-context";
import { Coordinate } from "~/types";
import { Arrived } from "./driving-state/arrived";
import { Matching } from "./driving-state/matching";
import { Pickup } from "./driving-state/pickup";

export const meta: MetaFunction = () => {
  return [{ title: "ISUCON14" }, { name: "description", content: "isucon14" }];
};

export default function DriverRequestWrapper() {
  const data = useClientChairRequestContext();
  const navigate = useNavigate();
  const { mutate: postChairActivity } = useChairPostActivity();
  const modalRef = useRef<{ close: () => void }>(null);

  const [selectedLocation, setSelectedLocation] = useState<Coordinate>();
  const [currentLocation, setCurrentLocation] = useState<Coordinate>();
  const [isActivated, setIsActivated] = useState(false);

  const [isSelectorModalOpen, setIsSelectorModalOpen] = useState(false);
  const selectorModalRef = useRef<HTMLElement & { close: () => void }>(null);
  const handleSelectorModalClose = useCallback(() => {
    if (selectorModalRef.current) {
      selectorModalRef.current.close();
    }
  }, []);

  const handleComplete = useCallback(() => {
    if (modalRef.current) {
      modalRef.current.close();
    }
  }, []);

  const handleOpenModal = useCallback(() => {
    setIsSelectorModalOpen(true);
  }, []);

  const onCloseModal = useCallback(() => {
    navigate("/driver", { replace: true });
  }, [navigate]);

  const onClickActivate = useCallback(() => {
    setIsActivated(true);
    void postChairActivity({
      body: {
        is_active: true,
      },
      headers: {
        Authorization: `Bearer ${data.auth?.accessToken}`,
      },
    });
  }, [data, postChairActivity]);

  const onClickDeactivate = useCallback(() => {
    setIsActivated(false);
    void postChairActivity({
      body: {
        is_active: false,
      },
      headers: {
        Authorization: `Bearer ${data.auth?.accessToken}`,
      },
    });
  }, [data, postChairActivity]);

  const onClose = useCallback(() => {
    setCurrentLocation(selectedLocation);
    setIsSelectorModalOpen(false);
  }, [selectedLocation]);

  const onMove = useCallback((coordinate: Coordinate) => {
    setSelectedLocation(coordinate);
  }, []);

  useEmulator();

  return (
    <>
      <Map initialCoordinate={selectedLocation} from={currentLocation} />
      <div className="space-y-6 m-6">
        <LocationButton
          className="w-full"
          label="現在地"
          location={currentLocation}
          onClick={() => {
            handleOpenModal();
          }}
          placeholder="現在地を選択する"
        />
        {isActivated ? (
          <Button
            variant="danger"
            className="w-full"
            onClick={() => onClickDeactivate()}
          >
            受付終了
          </Button>
        ) : (
          <Button
            variant="primary"
            className="w-full"
            onClick={() => onClickActivate()}
            disabled={!currentLocation}
          >
            受付開始
          </Button>
        )}
      </div>
      {data?.status && (
        <Modal ref={modalRef} onClose={onCloseModal}>
          {data.status === "MATCHING" && (
            <Matching
              name={data?.payload?.user?.name}
              ride_id={data?.payload?.ride_id}
            />
          )}
          {(data.status === "ENROUTE" ||
            data.status === "PICKUP" ||
            data.status === "CARRYING") && <Pickup />}
          {data.status === "ARRIVED" && <Arrived onComplete={handleComplete} />}
        </Modal>
      )}
      {isSelectorModalOpen && (
        <Modal ref={selectorModalRef} onClose={onClose}>
          <div className="flex flex-col items-center mt-4 h-full">
            <div className="flex-grow w-full max-h-[75%] mb-6">
              <Map
                onMove={onMove}
                from={currentLocation}
                initialCoordinate={currentLocation}
                selectable
                className="rounded-2xl"
              />
            </div>
            <p className="font-bold mb-4 text-base">現在地を選択してください</p>
            <Button className="w-full" onClick={handleSelectorModalClose}>
              現在地をセットする
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
