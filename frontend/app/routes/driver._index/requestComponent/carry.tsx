import type { RequestProps } from "./type";

export const Carry = ({ status }: RequestProps<"CARRYING" | "ARRIVED">) => {
  if (status === "ARRIVED") {
    /**
     * TODO: モーダル処理
     */
  }

  return (
    <>
      <div className="h-full text-center content-center bg-blue-200">Map</div>
      <div className="px-4 py-16 block justify-center border-t">
        <p>xxさんからの配車依頼</p>
        <p>{"from -> to"}</p>
      </div>
    </>
  );
};
