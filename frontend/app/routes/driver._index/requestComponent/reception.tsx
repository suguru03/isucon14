import { useCallback } from "react";
import {
  useChairPostActivate,
  useChairPostDeactivate,
} from "~/apiClient/apiComponents";

import { Button } from "~/components/primitives/button/button";
import type { RequestProps } from "~/components/request/type";
import { useClientChairRequestContext } from "~/contexts/driver-context";
import { ClientChairRequest } from "~/types";
import { Matching } from "./matching";

export const Reception = ({
  status,
  payload,
}: RequestProps<
  "MATCHING" | "IDLE",
  { payload: ClientChairRequest["payload"] }
>) => {
  const driver = useClientChairRequestContext();
  const { mutate: postChairActivate } = useChairPostActivate();
  const { mutate: postChairDeactivate } = useChairPostDeactivate();

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
      {status === "MATCHING" ? (
        <Matching name={payload?.user?.name} request_id={payload?.request_id} />
      ) : null}
      <div className="px-4 py-16 flex justify-center border-t gap-6">
        <Button onClick={() => onClickActivate()}>受付開始</Button>
        <Button onClick={() => onClickDeactivate()}>受付終了</Button>
      </div>
    </>
  );
};
