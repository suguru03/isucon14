import { FC, RefObject, useEffect, useState } from "react";
import { Toggle } from "~/components/primitives/form/toggle";
import { Text } from "~/components/primitives/text/text";

type SimulatorConfigType = {
  ghostChairEnabled: boolean;
};

export const SimulatorConfigDisplay: FC<{
  simulatorRef: RefObject<HTMLIFrameElement>;
}> = ({ simulatorRef }) => {
  const [config, setConfig] = useState<SimulatorConfigType>({
    ghostChairEnabled: true,
  });

  useEffect(() => {
    const sendMessage = () => {
      simulatorRef.current?.contentWindow?.postMessage(
        { type: "isuride.simulator.config", payload: config },
        "*",
      );
    };
    const timer = setTimeout(sendMessage, 800);
    return () => {
      clearTimeout(timer);
    };
  }, [config, simulatorRef]);

  return (
    <div className="bg-white rounded shadow px-6 py-4 w-full">
      <div className="flex justify-between items-center">
        <Text size="sm" className="text-neutral-500" bold>
          疑似チェアを表示する
        </Text>
        <Toggle
          id="ghost-chair"
          checked={config.ghostChairEnabled}
          onUpdate={(v) => {
            setConfig((c) => ({ ...c, ghostChairEnabled: v }));
          }}
        />
      </div>
    </div>
  );
};