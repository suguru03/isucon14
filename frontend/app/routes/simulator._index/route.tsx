import { useRef } from "react";
import { Simulator } from "~/components/modules/simulator/simulator";
import { SmartPhone } from "~/components/primitives/smartphone/smartphone";

export default function Index() {
  const ref = useRef<HTMLIFrameElement>(null);
  return (
    <div className="h-screen flex justify-center items-center space-x-16">
      <SmartPhone>
        <iframe
          title="ユーザー画面"
          src="/client"
          className="w-full h-full"
          ref={ref}
        />
      </SmartPhone>
      <div>
        <h1 className="text-lg font-semibold mb-2">Chair Simulator</h1>
        <Simulator simulatorRef={ref} />
      </div>
    </div>
  );
}
