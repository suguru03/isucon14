import type { MetaFunction } from "@remix-run/node";
import { useSimulatorContext } from "~/contexts/simulator-context";

export const meta: MetaFunction = () => {
  return [
    { title: "Simulator | ISURIDE" },
    { name: "description", content: "シュミレーター" },
  ];
};

export default function Index() {
  const simulator = useSimulatorContext();
  const targetOwner = simulator.owners?.[0];
  return (
    <ul>
      {targetOwner &&
        targetOwner.chairs.map((c, i) => {
          return (
            <li key={i}>
              name: {c.name}
              model: {c.model}
              lat: {c.coordinateState.coordinate?.latitude}
              lon: {c.coordinateState.coordinate?.longitude}
            </li>
          );
        })}
    </ul>
  );
}
