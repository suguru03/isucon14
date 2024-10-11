import type { MetaFunction } from "@remix-run/node";
import { useClientChairRequestContext } from "~/contexts/driver-context";
import { Arrive } from "./requestComponent/arrive";
import { Pickup } from "./requestComponent/pickup";
import { Reception } from "./requestComponent/reception";

export const meta: MetaFunction = () => {
  return [{ title: "ISUCON14" }, { name: "description", content: "isucon14" }];
};
function DriverRequest() {
  const data = useClientChairRequestContext();
  const requestStatus = data?.status ?? "IDLE";
  switch (requestStatus) {
    case "IDLE":
    case "MATCHING":
      return <Reception status={requestStatus} payload={data.payload} />;
    case "DISPATCHING":
    case "DISPATCHED":
    case "CARRYING":
      return <Pickup status={requestStatus} payload={data.payload} />;
    case "ARRIVED":
      return <Arrive />;
    default:
      return <div>unexpectedStatus: {requestStatus}</div>;
  }
}

export default function DriverRequestWrapper() {
  return (
    <>
      <DriverRequest />
    </>
  );
}
