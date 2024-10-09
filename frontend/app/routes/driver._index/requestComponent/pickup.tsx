import { Button } from "~/components/primitives/button/button";
import type { RequestProps } from "~/components/request/type";

export const Pickup = ({
  status,
}: RequestProps<"DISPATCHING" | "DISPATCHED">) => {
  return (
    <>
      <div className="h-full text-center content-center bg-blue-200">Map</div>
      <div className="px-4 py-16 block justify-center border-t">
        <p>xxさんからの配車依頼</p>
        <p>{"from -> to"}</p>
        {status === "DISPATCHED" ? (
          <Button onClick={() => {}}>出発</Button>
        ) : null}
      </div>
    </>
  );
};
