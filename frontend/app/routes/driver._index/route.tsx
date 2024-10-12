import type { MetaFunction } from "@remix-run/node";
import { useNavigate } from "@remix-run/react";
import { useCallback, useRef } from "react";
import {
  useChairPostActivate,
  useChairPostDeactivate,
} from "~/apiClient/apiComponents";
import { useEmulator } from "~/components/hooks/emulate";
import { Map } from "~/components/modules/map/map";
import { Button } from "~/components/primitives/button/button";
import { Modal } from "~/components/primitives/modal/modal";
import { useClientChairRequestContext } from "~/contexts/driver-context";
import { Arrived } from "./driving-state/arrived";
import { Matching } from "./driving-state/matching";
import { Pickup } from "./driving-state/pickup";
import LocationInput from "./setCurrentCoordination";

export const meta: MetaFunction = () => {
  return [{ title: "ISUCON14" }, { name: "description", content: "isucon14" }];
};

export default function DriverRequestWrapper() {
  const data = useClientChairRequestContext();
  const navigate = useNavigate();
  const { mutate: postChairActivate } = useChairPostActivate();
  const { mutate: postChairDeactivate } = useChairPostDeactivate();
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
        Authorization: `Bearer ${data.auth?.accessToken}`,
      },
    });
  }, [data, postChairActivate]);

  const onClickDeactivate = useCallback(() => {
    postChairDeactivate({
      headers: {
        Authorization: `Bearer ${data.auth?.accessToken}`,
      },
    });
  }, [data, postChairDeactivate]);

  return (
    <>
      <Map />
      <div className="px-4 py-16 flex justify-center border-t gap-6">
        <Button onClick={() => onClickActivate()}>受付開始</Button>
        <Button onClick={() => onClickDeactivate()}>受付終了</Button>
        <LocationInput />
      </div>
      {data?.status && (
        <Modal ref={modalRef} onClose={onCloseModal}>
          {data.status === "MATCHING" && (
            <Matching
              name={data?.payload?.user?.name}
              request_id={data?.payload?.request_id}
            />
          )}
          {(data.status === "DISPATCHING" ||
            data.status === "DISPATCHED" ||
            data.status === "CARRYING") && <Pickup />}
          {data.status === "ARRIVED" && <Arrived onComplete={handleComplete} />}
        </Modal>
      )}
    </>
  );
}
