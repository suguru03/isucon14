import { Form, useNavigate } from "@remix-run/react";
import { useRef } from "react";
import { Avatar } from "~/components/primitives/avatar/avatar";
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
            <Text>目的地に到着しました</Text>
            <Avatar size="lg" />
          </div>
          <div className="flex flex-col items-center gap-6 w-80">
            <Text>ドライビングは快適でしたか？</Text>
            <Rating name="rating" />
            <Button type="submit" onClick={handleCloseModal} className="px-4">
              評価してドライビングを完了
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};
