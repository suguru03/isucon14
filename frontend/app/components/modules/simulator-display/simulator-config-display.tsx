import { FC, RefObject, useCallback, useEffect, useState } from "react";
import { fetchChairPostActivity } from "~/api/api-components";
import { Toggle } from "~/components/primitives/form/toggle";
import { Text } from "~/components/primitives/text/text";
import { useSimulatorContext } from "~/contexts/simulator-context";
import {
  Message,
  MessageTypes,
  sendSimulatorConfig,
} from "~/utils/post-message";

type SimulatorConfigType = {
  ghostChairEnabled: boolean;
};

export const SimulatorConfigDisplay: FC<{
  simulatorRef: RefObject<HTMLIFrameElement>;
}> = ({ simulatorRef }) => {
  const [ready, setReady] = useState<boolean>(false);
  const { chair } = useSimulatorContext();
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
    if (!ready) return;
    if (simulatorRef.current?.contentWindow) {
      sendSimulatorConfig(simulatorRef.current.contentWindow, config);
    }
  }, [config, ready, simulatorRef]);

  useEffect(() => {
    const onMessage = ({ data }: MessageEvent<Message["ClientReady"]>) => {
      const isSameOrigin = origin == location.origin;
      if (isSameOrigin && data.type === MessageTypes.ClientReady) {
        setReady(Boolean(data?.payload?.ready));
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, []);

  return (
    <>
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
    </>
  );
};
