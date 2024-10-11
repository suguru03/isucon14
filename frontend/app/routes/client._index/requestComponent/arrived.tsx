import { Form, useNavigate, useSearchParams } from "@remix-run/react";
import { useCallback, useRef, useState } from "react";
import { fetchAppPostRequestEvaluate } from "~/apiClient/apiComponents";
import { ToIcon } from "~/components/icon/to";
import { Button } from "~/components/primitives/button/button";
import { Modal } from "~/components/primitives/modal/modal";
import { Rating } from "~/components/primitives/rating/rating";
import { Text } from "~/components/primitives/text/text";
import { useClientAppRequestContext } from "~/contexts/user-context";

export const Arrived = () => {
  const { auth, payload } = useClientAppRequestContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [rating, setRating] = useState(0);
  const modalRef = useRef<{ close: () => void }>(null);

  const handleCloseModal = useCallback(async () => {
    try {
      await fetchAppPostRequestEvaluate({
        headers: {
          Authorization: `Bearer ${auth?.accessToken}`,
        },
        pathParams: {
          requestId: payload?.request_id ?? "",
        },
        body: {
          evaluation: rating,
        },
      });
    } finally {
      if (modalRef.current) {
        modalRef.current.close();
      }
      if (searchParams.get("debug_status")) {
        navigate("/client?debug_status=IDLE", { replace: true });
      }
    }
  }, [auth, payload, rating, modalRef, searchParams, navigate]);

  return (
    <div>
      <Modal ref={modalRef}>
        <Form className="h-full flex flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-6 mb-14">
            <ToIcon className="size-[90px] " />
            <Text size="xl">目的地に到着しました</Text>
          </div>
          <div className="flex flex-col items-center gap-4 w-80">
            <Text>今回のドライブはいかがでしたか？</Text>
            <Rating name="rating" rating={rating} setRating={setRating} />
            <Button
              variant="primary"
              onClick={() => void handleCloseModal()}
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
