import type { MetaFunction } from "@remix-run/react";
import { Simulator } from "~/components/modules/simulator/simulator";
import { SmartPhone } from "~/components/primitives/smartphone/smartphone";

export const meta: MetaFunction = () => {
  return [
    { title: "Simulator | ISURIDE" },
    { name: "description", content: "isucon14" },
  ];
};

export default function Index() {
  return (
    <div className="h-screen flex justify-center items-center space-x-16">
      <SmartPhone>
        <iframe title="ユーザー画面" src="/client" className="w-full h-full" />
      </SmartPhone>
      <div>
        <h1 className="text-lg font-semibold mb-2">Chair Simulator</h1>
        <Simulator />
      </div>
    </div>
  );
}
