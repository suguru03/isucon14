import type { MetaFunction } from "@remix-run/node";
import { useRequest } from "../../contexts/driver-context";
import { Carry } from "./requestComponent/carry";
import { Pickup } from "./requestComponent/pickup";
import { Reception } from "./requestComponent/reception";

export const meta: MetaFunction = () => {
  return [{ title: "ISUCON14" }, { name: "description", content: "isucon14" }];
};
function DriverRequest() {
  const { data } = useRequest();
  const requestStatus = data?.status ?? "IDLE";
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
