import { useEffect, useState } from "react";
import { NearByChair } from "~/types";

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const emulateChairs = [...Array(100).keys()].map((i) => {
  return {
    id: "simulate" + i,
    current_coordinate: {
      latitude: randomInt(-500, 500),
      longitude: randomInt(-500, 500),
    },
    model: String(i),
    name: "hoge",
  };
}) satisfies NearByChair[];

export const useGhostChairs = (): NearByChair[] => {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [chairs, setChairs] = useState<NearByChair[]>(emulateChairs);

  useEffect(() => {
    const onMessage = ({
      origin,
      data,
    }: MessageEvent<{
      type: "isuride.simulator.config";
      payload?: { ghostChairEnabled?: boolean };
    }>) => {
      const isSameOrigin = origin == location.origin;
      if (isSameOrigin && data.type === "isuride.simulator.config") {
        setEnabled(data?.payload?.ghostChairEnabled ?? false);
      }
    };
    window.addEventListener("message", onMessage, false);
    return () => {
      window.removeEventListener("message", onMessage, false);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      setChairs((data) => {
        return data.map((chair) => {
          return {
            ...chair,
            current_coordinate: {
              latitude: chair.current_coordinate.latitude + randomInt(-2, 2),
              longitude: chair.current_coordinate.longitude + randomInt(-2, 2),
            },
          };
        });
      });
      timer = setTimeout(update, 1000);
    };
    update();
    return () => {
      clearTimeout(timer);
    };
  }, [enabled]);

  return enabled ? chairs : [];
};
