import { useNavigate } from "@remix-run/react";
import { useRef } from "react";
import { ToIcon } from "~/components/icon/to";
import { Button } from "~/components/primitives/button/button";
import { Modal } from "~/components/primitives/modal/modal";
import { Text } from "~/components/primitives/text/text";

export const Arrive = () => {
  const modalRef = useRef<{ close: () => void }>(null);

  const handleCloseModal = () => {
    if (modalRef.current) {
      modalRef.current.close();
    }
  };

  const navigate = useNavigate();

  const onCloseModal = () => {
    navigate("/driver", { replace: true });
  };

  return (
    <Modal ref={modalRef} onClose={onCloseModal}>
      <div className="h-full flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-6 mb-14">
          <ToIcon className="size-[90px] " />
          <Text size="xl">目的地に到着しました</Text>
        </div>
        <Button
          type="submit"
          variant="primary"
          onClick={handleCloseModal}
          className="w-full mt-1"
        >
          ドライビングを完了
        </Button>
      </div>
    </Modal>
  );
};
