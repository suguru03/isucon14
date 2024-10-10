import { Button } from "~/components/primitives/button/button";
import type { RequestProps } from "./type";
import { useState } from "react";
import { ReceptionMapModal } from "./receptionMapModal";

export const Reception = ({
  status,
}: RequestProps<"IDLE" | "MATCHING" | "DISPATCHING">) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const onCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      {status === "IDLE" ? (
        <div className="h-full text-center content-center bg-blue-200">Map</div>
      ) : (
        <div>配車しています</div>
      )}
      <div className="px-4 py-16 block justify-center border-t">
        <Button onClick={handleOpenModal}>from</Button>
        <Button onClick={handleOpenModal}>to</Button>
        {status === "IDLE" ? (
          <Button onClick={() => {}}>配車</Button>
        ) : (
          <Button onClick={() => {}}>配車をキャンセルする</Button>
        )}
      </div>

      {isModalOpen && <ReceptionMapModal onClose={onCloseModal} />}
    </>
  );
};
