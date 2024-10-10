import { useEffect, useState } from "react";
import {
  useChairPostActivate,
  useChairPostDeactivate,
} from "~/apiClient/apiComponents";
import { Button } from "~/components/primitives/button/button";
import type { RequestProps } from "~/components/request/type";
import { useDriver } from "~/contexts/driver-context";

export const Reception = ({ status }: RequestProps<"IDLE" | "MATCHING">) => {
  const driver = useDriver();
  const { mutate: postChairActivate } = useChairPostActivate();
  const { mutate: postChairDeactivate } = useChairPostDeactivate();

  const [isReception, setReception] = useState<boolean>(false);
  useEffect(() => {
    if (isReception) {
      postChairActivate({
        headers: {
          Authorization: `Bearer ${driver.accessToken}`,
        },
      });
    } else {
      postChairDeactivate({
        headers: {
          Authorization: `Bearer ${driver.accessToken}`,
        },
      });
    }
  }, [isReception]); //eslint-disable-line react-hooks/exhaustive-deps

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
          <Button onClick={() => setReception(false)}>受付終了</Button>
        ) : (
          <Button onClick={() => setReception(true)}>受付開始</Button>
        )}
      </div>
    </>
  );
};
