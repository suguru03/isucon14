import { PropsWithChildren, useRef } from "react";
import { Map } from "~/components/modules/map/map";
import { Button } from "~/components/primitives/button/button";
import { Modal } from "~/components/primitives/modal/modal";

type ReceptionMapModalProps = PropsWithChildren<{
  onClose?: () => void;
}>;

export const ReceptionMapModal = ({
  children,
  onClose,
}: ReceptionMapModalProps) => {
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
      <div className="flex flex-col items-center space-y-12 mt-4 h-full">
        <div className="flex-grow w-full max-h-[75%]">
          <Map />
        </div>
        <Button onClick={handleCloseModal}>{children}</Button>
      </div>
    </Modal>
  );
};
