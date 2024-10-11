import { Map } from "~/components/modules/map/map";
import type { RequestProps } from "~/components/request/type";

export const Carry = ({ status }: RequestProps<"CARRYING" | "ARRIVED">) => {
  if (status === "ARRIVED") {
    /**
     * TODO: モーダル処理
     */
  }

  return (
    <>
      <Map />
      <div className="px-4 py-16 block justify-center border-t">
        <p>xxさんからの配車依頼</p>
        <p>{"from -> to"}</p>
      </div>
    </>
  );
};
