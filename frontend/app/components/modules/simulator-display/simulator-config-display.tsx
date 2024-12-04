import { FC, RefObject, useCallback, useEffect, useState } from "react";
import { fetchChairPostActivity } from "~/apiClient/apiComponents";
import { Toggle } from "~/components/primitives/form/toggle";
import { Text } from "~/components/primitives/text/text";
import { useSimulatorContext } from "~/contexts/simulator-context";

type SimulatorConfigType = {
  ghostChairEnabled: boolean;
};

export const SimulatorConfigDisplay: FC<{
  simulatorRef: RefObject<HTMLIFrameElement>;
}> = ({ simulatorRef }) => {
  const { targetChair: chair } = useSimulatorContext();
  const [activate, setActivate] = useState<boolean>(true);

  const toggleActivate = useCallback(
    (activity: boolean) => {
      try {
        void fetchChairPostActivity({ body: { is_active: activity } });
        setActivate(activity);
      } catch (error) {
        console.error(error);
      }
    },
    [setActivate],
  );

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
    <>
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
      {chair && (
        <div className="bg-white rounded shadow px-6 py-4 w-full">
          <div className="flex justify-between items-center">
            <Text size="sm" className="text-neutral-500" bold>
              配車を受け付ける
            </Text>
            <Toggle
              checked={activate}
              onUpdate={(v) => toggleActivate(v)}
              id="chair-activity"
            />
          </div>
        </div>
      )}
    </>
  );
};
