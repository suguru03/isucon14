import type { MetaFunction } from "@remix-run/node";
import { useNavigate } from "@remix-run/react";
import { useCallback, useRef } from "react";
import {
  useChairPostActivate,
  useChairPostDeactivate,
} from "~/apiClient/apiComponents";
import { Map } from "~/components/modules/map/map";
import { Button } from "~/components/primitives/button/button";
import { Modal } from "~/components/primitives/modal/modal";
import { useClientChairRequestContext } from "~/contexts/driver-context";
import { useEmulator } from "~/components/hooks/emulate";
import { Arrive } from "./modal-views/arrive";
import { Matching } from "./modal-views/matching";
import { Pickup } from "./modal-views/pickup";

export const meta: MetaFunction = () => {
  return [{ title: "ISUCON14" }, { name: "description", content: "isucon14" }];
};

export default function DriverRequestWrapper() {
  const data = useClientChairRequestContext();
  const navigate = useNavigate();
  const driver = useClientChairRequestContext();
  const { mutate: postChairActivate } = useChairPostActivate();
  const { mutate: postChairDeactivate } = useChairPostDeactivate();
  const requestStatus = data?.status;
  const modalRef = useRef<{ close: () => void }>(null);
  useEmulator();
  const handleComplete = useCallback(() => {
    if (modalRef.current) {
      modalRef.current.close();
    }
  }, []);

  const onCloseModal = useCallback(() => {
    navigate("/driver", { replace: true });
  }, [navigate]);

  const onClickActivate = useCallback(() => {
    postChairActivate({
      headers: {
        Authorization: `Bearer ${driver.auth?.accessToken}`,
      },
    });
  }, [driver, postChairActivate]);

  const onClickDeactivate = useCallback(() => {
    postChairDeactivate({
      headers: {
        Authorization: `Bearer ${driver.auth?.accessToken}`,
      },
    });
  }, [driver, postChairDeactivate]);

  return (
    <>
      <Map />
      <div className="px-4 py-16 flex justify-center border-t gap-6">
        <Button onClick={() => onClickActivate()}>受付開始</Button>
        <Button onClick={() => onClickDeactivate()}>受付終了</Button>
      </div>
      {requestStatus && (
        <Modal ref={modalRef} disableCloseOnBackdrop onClose={onCloseModal}>
          {requestStatus === "MATCHING" && (
            <Matching
              name={data?.payload?.user?.name}
              request_id={data?.payload?.request_id}
            />
          )}
          {requestStatus === "DISPATCHING" ||
            requestStatus === "DISPATCHED" ||
            (requestStatus === "CARRYING" && (
              <Pickup status={requestStatus} payload={data.payload} />
            ))}
          {requestStatus === "ARRIVED" && (
            <Arrive onComplete={handleComplete} />
          )}
        </Modal>
      )}
    </>
  );
}
