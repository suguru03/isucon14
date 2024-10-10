import { Button } from "~/components/primitives/button/button";
import { useRef } from "react";
import { Modal } from "~/components/primitives/modal/modal";

type ReceptionMapModalProps = {
  onClose?: () => void;
};

export const ReceptionMapModal = ({ onClose }: ReceptionMapModalProps) => {
  const modalRef = useRef<{ close: () => void }>(null);

  const handleCloseModal = () => {
    if (modalRef.current) {
      modalRef.current.close();
    }
  };

  const onCloseModal = () => {
    onClose?.();
  };

  return (
    <Modal ref={modalRef} onClose={onCloseModal}>
      <div className="flex flex-col items-center space-y-8 mt-8">
        <div className="w-full h-[60vh] bg-blue-200 flex items-center justify-center">
          Map
        </div>
        <div className="px-4 w-full">
          <Button onClick={handleCloseModal}>この場所に移動する</Button>
        </div>
      </div>
    </Modal>
  );
};
