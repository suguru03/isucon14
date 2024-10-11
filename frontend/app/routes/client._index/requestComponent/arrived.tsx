import { Form, useNavigate } from "@remix-run/react";
import { useRef } from "react";
import { ToIcon } from "~/components/icon/to";
import { Button } from "~/components/primitives/button/button";
import { Modal } from "~/components/primitives/modal/modal";
import { Rating } from "~/components/primitives/rating/rating";
import { Text } from "~/components/primitives/text/text";

export const Arrived = () => {
  const modalRef = useRef<{ close: () => void }>(null);

  const handleCloseModal = () => {
    if (modalRef.current) {
      modalRef.current.close();
    }
  };

  const navigate = useNavigate();

  const onCloseModal = () => {
    navigate("/client", { replace: true });
  };

  return (
    <div>
      <Modal ref={modalRef} onClose={onCloseModal}>
        <Form className="h-full flex flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-6 mb-14">
            <ToIcon className="size-[90px] " />
            <Text size="xl">目的地に到着しました</Text>
          </div>
          <div className="flex flex-col items-center gap-4 w-80">
            <Text>今回のドライブはいかがでしたか？</Text>
            <Rating name="rating" />
            <Button
              type="submit"
              variant="primary"
              onClick={handleCloseModal}
              className="w-full mt-1"
            >
              評価してドライビングを完了
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};
