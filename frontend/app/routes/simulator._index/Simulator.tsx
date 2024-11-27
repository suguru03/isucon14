import { useEmulator } from "~/components/hooks/emulate";
import { useSimulatorContext } from "~/contexts/simulator-context";
import { ChairInfo } from "./ChairInfo";
import { useEffect } from "react";
import { fetchChairPostActivity } from "~/apiClient/apiComponents";

export function Simulator() {
  const { targetChair } = useSimulatorContext();
  useEmulator(targetChair);
  useEffect(() => {
    const abortController = new AbortController();
    try {
      void fetchChairPostActivity(
        { body: { is_active: true } },
        abortController.signal,
      );
    } catch (e) {
      if (typeof e === "string") {
        console.error(`CONSOLE ERROR: ${e}`);
      }
    }
    return () => abortController.abort();
  }, []);
  return (
    <div className="bg-white rounded shadow w-[400px] px-4 py-2">
      {targetChair !== undefined ? <ChairInfo chair={targetChair} /> : null}
    </div>
  );
}
