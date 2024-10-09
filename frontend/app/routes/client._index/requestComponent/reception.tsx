import { Button } from "~/components/primitives/button/button";
import type { RequestComponentProps } from "./type";

export const Reception: RequestComponentProps<
  "IDLE" | "MATCHING" | "DISPATCHING"
> = ({ status }) => {
  return (
    <>
      {status === "IDLE" ? (
        <div className="h-full text-center content-center bg-blue-200">Map</div>
      ) : (
        <div>配車しています</div>
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
