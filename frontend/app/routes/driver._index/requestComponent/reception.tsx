import { useCallback, useRef, useState } from "react";
import {
  useChairPostActivate,
  useChairPostDeactivate,
} from "~/apiClient/apiComponents";
import type { Coordinate } from "~/apiClient/apiSchemas";

import { Map } from "~/components/modules/map/map";
import { Button } from "~/components/primitives/button/button";
import type { RequestProps } from "~/components/request/type";
import { useClientChairRequestContext } from "~/contexts/driver-context";
import { ClientChairRequest } from "~/types";
import { MatchingModal } from "./matching";
import { LocationButton } from "~/components/modules/location-button/location-button";
import { Modal } from "~/components/primitives/modal/modal";

export const Reception = ({
  status,
  payload,
}: RequestProps<
  "MATCHING" | "IDLE",
  { payload: ClientChairRequest["payload"] }
>) => {
  const driver = useClientChairRequestContext();
  const { mutate: postChairActivate } = useChairPostActivate();
  const { mutate: postChairDeactivate } = useChairPostDeactivate();

  const [selectLocation, setSelectLocation] = useState<Coordinate>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef<{ close: () => void }>(null);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const onClose = () => {
    setIsModalOpen(false);
  };

  const onMove = (coordinate: Coordinate) => {
    setSelectLocation(coordinate);
  };

  const handleCloseModal = () => {
    driver.chair?.currentCoordinate.setter(selectLocation);
    if (modalRef.current) {
      modalRef.current.close();
    }
  };

  const onClickActivate = useCallback(() => {
    postChairActivate({
      headers: {
        Authorization: `Bearer ${driver.auth?.accessToken}`,
      },
    });
  }, [driver, postChairActivate]);
  const onClickDeactivate = useCallback(() => {
    postChairDeactivate({
      headers: {
        Authorization: `Bearer ${driver.auth?.accessToken}`,
      },
    });
  }, [driver, postChairDeactivate]);

  return (
    <>
      {status === "MATCHING" ? (
        <MatchingModal
          name={payload?.user?.name}
          request_id={payload?.request_id}
        />
      ) : null}
      <Map />
      <div className="px-4 py-16 flex justify-center border-t gap-6">
        <Button onClick={() => onClickActivate()}>受付開始</Button>
        <Button onClick={() => onClickDeactivate()}>受付終了</Button>
        <LocationButton
          className="w-full"
          location={driver.chair?.currentCoordinate.location}
          onClick={() => handleOpenModal()}
          placeholder="現在地を選択する"
          label="from"
        />
      </div>
      {isModalOpen && (
        <Modal ref={modalRef} onClose={onClose}>
          <div className="flex flex-col items-center mt-4 h-full">
            <div className="flex-grow w-full max-h-[75%] mb-6">
              <Map onMove={onMove} selectable />
            </div>
            <p className="font-bold mb-4 text-base">現在地を選択してください</p>
            <Button onClick={handleCloseModal}>この場所から移動する</Button>
          </div>
        </Modal>
      )}
    </>
  );
};

Modal;
