import type { MetaFunction } from "@remix-run/node";
import { useNavigate } from "@remix-run/react";
import { useRef } from "react";
import { Map } from "~/components/modules/map/map";
import { Modal } from "~/components/primitives/modal/modal";
import { useClientChairRequestContext } from "~/contexts/driver-context";
import { Arrive } from "./requestComponent/arrive";
import { Pickup } from "./requestComponent/pickup";
import { Reception } from "./requestComponent/reception";

export const meta: MetaFunction = () => {
  return [{ title: "ISUCON14" }, { name: "description", content: "isucon14" }];
};

export default function DriverRequestWrapper() {
  const data = useClientChairRequestContext();
  const requestStatus = data?.status ?? "IDLE";

  const modalRef = useRef<{ close: () => void }>(null);

  const handleComplete = () => {
    if (modalRef.current) {
      modalRef.current.close();
    }
  };

  const navigate = useNavigate();

  const onCloseModal = () => {
    navigate("/driver", { replace: true });
  };

  return (
    <>
      <Map />
      {requestStatus !== "IDLE" ? (
        <Modal ref={modalRef} disableCloseOnBackdrop onClose={onCloseModal}>
          {requestStatus === "MATCHING" ? (
            <Reception status={requestStatus} payload={data.payload} />
          ) : requestStatus === "DISPATCHING" ||
            requestStatus === "DISPATCHED" ||
            requestStatus === "CARRYING" ? (
            <Pickup status={requestStatus} payload={data.payload} />
          ) : requestStatus === "ARRIVED" ? (
            <Arrive onComplete={handleComplete} />
          ) : (
            <div>unexpectedStatus: {requestStatus}</div>
          )}
        </Modal>
      ) : null}
    </>
  );
}
