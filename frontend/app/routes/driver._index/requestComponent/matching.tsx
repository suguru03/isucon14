import { useNavigate } from "@remix-run/react";
import { useCallback, useRef } from "react";
import {
  useChairPostRequestAccept,
  useChairPostRequestDeny,
} from "~/apiClient/apiComponents";
import { ChairIcon } from "~/components/icon/chair";
import { Button } from "~/components/primitives/button/button";
import { Modal } from "~/components/primitives/modal/modal";
import { Text } from "~/components/primitives/text/text";
import { useClientChairRequestContext } from "~/contexts/driver-context";

export const MatchingModal = ({
  name,
  request_id,
}: {
  name?: string;
  request_id?: string;
}) => {
  const { auth } = useClientChairRequestContext();
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

  const { mutate: postChairRequestAccept } = useChairPostRequestAccept();
  const { mutate: postChairRequestDeny } = useChairPostRequestDeny();

  const handleAccept = useCallback(() => {
    postChairRequestAccept({
      pathParams: { requestId: request_id || "" },
      headers: {
        Authorization: `Bearer ${auth?.accessToken}`,
      },
    });
  }, [auth, postChairRequestAccept, request_id]);
  const handleDeny = useCallback(() => {
    postChairRequestDeny({
      pathParams: { requestId: request_id || "" },
      headers: {
        Authorization: `Bearer ${auth?.accessToken}`,
      },
    });
  }, [auth, postChairRequestDeny, request_id]);

  return (
    <Modal ref={modalRef} onClose={onCloseModal}>
      <div className="h-full text-center content-center">
        <div className="flex flex-col items-center my-8 gap-8">
          <ChairIcon className="size-[48px]" />

          <Text>
            <span className="font-bold mx-1">{name}</span>
            さんから配車要求が届いています
          </Text>

          <Text>{"from->to 到着予定時間"}</Text>

          <div>
            <div className="my-2">
              <Button
                onClick={() => {
                  handleAccept();
                  handleCloseModal();
                }}
              >
                配車を受け付ける
              </Button>
            </div>
            <div className="my-2">
              <Button
                onClick={() => {
                  handleDeny();
                  handleCloseModal();
                }}
              >
                キャンセル
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
