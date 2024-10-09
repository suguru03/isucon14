import type { MetaFunction } from "@remix-run/node";
import { useRequest } from "../client/userProvider";
import { Running } from "./requestComponent/running";
import { Reception } from "./requestComponent/reception";
import { Arrived } from "./requestComponent/arrived";
import type { ClientRequestStatus } from "~/routes/client/userProvider";

export const meta: MetaFunction = () => {
  return [{ title: "ISUCON14" }, { name: "description", content: "isucon14" }];
};
function ClientRequest() {
  const { data, isLoading } = useRequest();
  let requestStatus: ClientRequestStatus = data.status;
  if (!isLoading && data?.status) {
    requestStatus = data?.status;
  }
  switch (requestStatus) {
    case "IDLE":
    case "MATCHING":
    case "DISPATCHING":
      return <Reception status={requestStatus} />;
    case "DISPATCHED":
    case "CARRYING":
      return <Running status={requestStatus} />;
    case "ARRIVED":
      return <Arrived />;
    default:
      return <div>unexpectedStatus: {requestStatus}</div>;
  }
}

export default function ClientRequestWrapper() {
  return (
    <div className="h-full flex flex-col">
      <ClientRequest />
    </div>
  );
}
