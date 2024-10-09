import { Button } from "~/components/primitives/button/button";
import type { RequestProps } from "~/components/request/type";
import { ChairIcon } from "~/components/icon/chair";
import { Map } from "~/components/modules/map/map";

export const Reception = ({
  status,
}: RequestProps<"IDLE" | "MATCHING" | "DISPATCHING">) => {
  return (
    <>
      {status === "IDLE" ? (
        <Map />
      ) : (
        <div className="flex flex-col items-center my-8 gap-4">
          <ChairIcon className="size-[48px]" />
          <p>配車しています</p>
        </div>
      )}
      <div className="px-4 py-16 block justify-center border-t">
        <Button onClick={() => {}}>from</Button>
        <Button onClick={() => {}}>to</Button>
        {status === "IDLE" ? (
          <Button onClick={() => {}}>配車</Button>
        ) : (
          <Button onClick={() => {}}>配車をキャンセルする</Button>
        )}
      </div>
    </>
  );
};
