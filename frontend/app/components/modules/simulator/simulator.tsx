import { FC, RefObject, useEffect } from "react";
import { fetchChairPostActivity } from "~/apiClient/apiComponents";
import { SimulatorChairDisplay } from "../simulator-display/simulator-chair-display";
import { SimulatorConfigDisplay } from "../simulator-display/simulator-config-display";

export const Simulator: FC<{ simulatorRef: RefObject<HTMLIFrameElement> }> = ({
  simulatorRef,
}) => {
  useEffect(() => {
    try {
      void fetchChairPostActivity({ body: { is_active: true } });
    } catch (error) {
      console.error(error);
    }
  }, []);

  return (
    <div className="space-y-4 min-w-[320px] px-4 py-2 lg:w-[400px]">
      <SimulatorChairDisplay />
      <SimulatorConfigDisplay simulatorRef={simulatorRef} />
    </div>
  );
};
