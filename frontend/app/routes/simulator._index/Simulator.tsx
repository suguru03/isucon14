import { useEmulator } from "~/components/hooks/emulate";
import { useSimulatorContext } from "~/contexts/simulator-context";
import { ChairInfo } from "./ChairInfo";

export function Simulator() {
  const { targetChair } = useSimulatorContext();
  useEmulator(targetChair);

  return (
    <div className="bg-white rounded shadow w-[400px] px-4 py-2">
      {targetChair !== undefined ? <ChairInfo chair={targetChair} /> : null}
    </div>
  );
}
