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
  return (
    <ul>
      {simulator.chairs.map((c, i) => {
        return (
          <li key={i}>
            name: {c.name}
            model: {c.model}
            lat: {c.coordinate.latitude}
            lon: {c.coordinate.longitude}
          </li>
        );
      })}
    </ul>
  );
}
