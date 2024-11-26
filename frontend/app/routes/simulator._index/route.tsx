import { Simulator } from "./Simulator";
import { SmartPhone } from "./SmartPhone";

export default function Index() {
  return (
    <div className="h-screen min-h-[1000px] min-w-[1200px] flex justify-center items-center gap-32">
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
