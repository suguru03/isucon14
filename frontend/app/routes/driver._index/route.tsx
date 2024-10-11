import type { MetaFunction } from "@remix-run/node";
import { useUser } from "../../contexts/user-context";
import { Pickup } from "./requestComponent/pickup";
import { Reception } from "./requestComponent/reception";
import { Carry } from "./requestComponent/carry";

export const meta: MetaFunction = () => {
  return [{ title: "ISUCON14" }, { name: "description", content: "isucon14" }];
};
function DriverRequest() {
  const { request } = useUser();
  const requestStatus = request?.status ?? "IDLE";
  switch (requestStatus) {
    case "IDLE":
    case "MATCHING":
      return <Reception status={requestStatus} />;
    case "DISPATCHING":
    case "DISPATCHED":
      return <Pickup status={requestStatus} />;
    case "CARRYING":
    case "ARRIVED":
      return <Carry status={requestStatus} />;
    default:
      return <div>unexpectedStatus: {requestStatus}</div>;
  }
}

export default function DriverRequestWrapper() {
  return (
    <div className="h-full flex flex-col">
      <DriverRequest />
    </div>
  );
}
