import { PropsWithChildren, useRef } from "react";
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
      <div className="flex flex-col items-center space-y-12 mt-4">
        <div className="w-full h-[60vh] bg-blue-200 flex items-center justify-center">
          Map
        </div>
        <div className="w-full block">
          <Button onClick={handleCloseModal}>{children}</Button>
        </div>
      </div>
    </Modal>
  );
};
