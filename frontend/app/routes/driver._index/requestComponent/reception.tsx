import { useCallback, useState } from "react";
import {
  useChairPostActivate,
  useChairPostDeactivate,
} from "~/apiClient/apiComponents";
import { ChairRequest } from "~/apiClient/apiSchemas";
import { Button } from "~/components/primitives/button/button";
import { useDriver } from "~/contexts/driver-context";
import { MatchingModal } from "./matching";
import type { RequestProps } from "~/components/request/type";
import { ClientChairRequest } from "~/types";

export const Reception = ({
  status,
  payload,
}: RequestProps<
  "MATCHING" | "IDLE",
  { payload: ClientChairRequest["payload"] }
>) => {
  const driver = useDriver();
  const [isReception, setReception] = useState<boolean>(false);
  const { mutate: postChairActivate } = useChairPostActivate();
  const { mutate: postChairDeactivate } = useChairPostDeactivate();

  const onClickActivate = useCallback(() => {
    setReception(true);
    postChairActivate({
      headers: {
        Authorization: `Bearer ${driver.auth?.accessToken}`,
      },
    });
  }, [driver, postChairActivate]);
  const onClickDeactivate = useCallback(() => {
    setReception(false);
    postChairDeactivate({
      headers: {
        Authorization: `Bearer ${driver.auth?.accessToken}`,
      },
    });
  }, [driver, postChairDeactivate]);

  return (
    <>
      {status === "MATCHING" ? (
        <MatchingModal
          name={payload?.user?.name}
          request_id={payload?.request_id}
        />
      ) : null}
      <div className="h-full text-center content-center bg-blue-200">Map</div>
      <div className="px-4 py-16 block justify-center border-t">
        {isReception ? (
          <Button onClick={() => onClickDeactivate()}>受付終了</Button>
        ) : (
          <Button onClick={() => onClickActivate()}>受付開始</Button>
        )}
      </div>
    </>
  );
};
