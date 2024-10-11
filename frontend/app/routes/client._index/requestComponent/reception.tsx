import { useCallback, useState } from "react";
import { fetchAppPostRequest } from "~/apiClient/apiComponents";
import { ChairIcon } from "~/components/icon/chair";
import { Map } from "~/components/modules/map/map";
import { Button } from "~/components/primitives/button/button";
import type { RequestProps } from "~/components/request/type";
import { useUser } from "~/contexts/user-context";
import { ReceptionMapModal } from "./receptionMapModal";

type Action = "from" | "to";

export const Reception = ({
  status,
}: RequestProps<"IDLE" | "MATCHING" | "DISPATCHING">) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [action, setAction] = useState<Action>("from");
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  const [requestId, setRequestId] = useState<string>("");

  const user = useUser();
  const handleRideRequest = useCallback(async () => {
    await fetchAppPostRequest({
      body: {
        pickup_coordinate: {
          latitude: 0,
          longitude: 0,
        },
        destination_coordinate: {
          latitude: 0,
          longitude: 0,
        },
      },
      headers: {
        Authorization: `Bearer ${user.accessToken}`,
      },
    }).then((res) => setRequestId(res.request_id));
  }, [user]);

  const handleOpenModal = (action: Action) => {
    setIsModalOpen(true);
    setAction(action);
  };

  const onCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      {status === "IDLE" ? (
        <Map />
      ) : (
        <div className="flex flex-col items-center my-8 gap-4">
          <ChairIcon className="size-[48px]" />
          <p>配車しています</p>
        </div>
      )}
      <div className="px-4 py-16 block justify-center border-t">
        <Button onClick={() => handleOpenModal("from")}>from</Button>
        <Button onClick={() => handleOpenModal("to")}>to</Button>
        {status === "IDLE" ? (
          <Button onClick={() => void handleRideRequest()}>配車</Button>
        ) : (
          <Button onClick={() => {}}>配車をキャンセルする</Button>
        )}
      </div>

      {isModalOpen && (
        <ReceptionMapModal onClose={onCloseModal}>
          {action === "from" ? "この場所から移動する" : "この場所に移動する"}
        </ReceptionMapModal>
      )}
    </>
  );
};
