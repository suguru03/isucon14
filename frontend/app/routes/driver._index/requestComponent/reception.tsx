import { Button } from "~/components/primitives/button/button";
import type { RequestProps } from "~/components/request/type";
import { useState } from "react";

export const ConfirmReception = () => {};

export const Reception = ({ status }: RequestProps<"IDLE" | "MATCHING">) => {
  const [isReception, setReception] = useState<boolean>(false);

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
