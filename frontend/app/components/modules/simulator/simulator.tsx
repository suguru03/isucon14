import { FC, useEffect } from "react";
import { fetchChairPostActivity } from "~/apiClient/apiComponents";
import { useEmulator } from "~/components/hooks/use-emulate";
import { Text } from "~/components/primitives/text/text";
import { useSimulatorContext } from "~/contexts/simulator-context";
import { SimulatorChairInformation } from "../simulator-chair-information/simulator-chair-information";

export const Simulator: FC = () => {
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
      {targetChair !== undefined ? (
        <SimulatorChairInformation chair={targetChair} />
      ) : (
        <Text className="m-4" size="sm">
          椅子のデータがありません
        </Text>
      )}
    </div>
  );
};
