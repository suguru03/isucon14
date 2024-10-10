import { useCallback, useState } from "react";
import {
  useChairPostActivate,
  useChairPostDeactivate,
} from "~/apiClient/apiComponents";
import { Button } from "~/components/primitives/button/button";
import type { RequestProps } from "~/components/request/type";
import { useDriver } from "~/contexts/driver-context";

export const Reception = ({ status }: RequestProps<"IDLE" | "MATCHING">) => {
  const driver = useDriver();
  const [isReception, setReception] = useState<boolean>(false);
  const { mutate: postChairActivate } = useChairPostActivate();
  const { mutate: postChairDeactivate } = useChairPostDeactivate();

  const onClickActivate = useCallback(() => {
    setReception(true);
    postChairActivate({
      headers: {
        Authorization: `Bearer ${driver.accessToken}`,
      },
    });
  }, []);
  const onClickDeactivate = useCallback(() => {
    setReception(false);
    postChairDeactivate({
      headers: {
        Authorization: `Bearer ${driver.accessToken}`,
      },
    });
  }, []);

  if (status === "MATCHING") {
    /**
     * TODO: 配車を受付するモーダル
     */
  }

  return (
    <>
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
