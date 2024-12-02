import type { MetaFunction } from "@remix-run/react";
import { useEffect, useRef } from "react";
import { fetchChairPostActivity } from "~/apiClient/apiComponents";
import { SimulatorChairDisplay } from "~/components/modules/simulator-display/simulator-chair-display";
import { SimulatorConfigDisplay } from "~/components/modules/simulator-display/simulator-config-display";
import { SmartPhone } from "~/components/primitives/smartphone/smartphone";

export const meta: MetaFunction = () => {
  return [
    { title: "Simulator | ISURIDE" },
    { name: "description", content: "isucon14" },
  ];
};

export default function Index() {
  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    try {
      void fetchChairPostActivity({ body: { is_active: true } });
    } catch (error) {
      console.error(error);
    }
  }, []);

  return (
    <div className="h-screen flex justify-center items-center space-x-8 lg:space-x-16">
      <SmartPhone>
        <iframe
          title="ユーザー画面"
          src="/client"
          className="w-full h-full"
          ref={ref}
        />
      </SmartPhone>
      <div className="space-y-4 min-w-[320px] lg:w-[400px]">
        <h1 className="text-lg font-semibold mb-4">Chair Simulator</h1>
        <SimulatorChairDisplay />
        <SimulatorConfigDisplay simulatorRef={ref} />
      </div>
    </div>
  );
}
