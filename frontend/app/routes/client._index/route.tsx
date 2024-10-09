import type { MetaFunction } from "@remix-run/node";
import { useRequest } from "../client/userProvider";
import { Running } from "./requestComponent/running";
import { Reception } from "./requestComponent/reception";
import { Arrived } from "./requestComponent/arrived";
import type { FC } from "react";

export const meta: MetaFunction = () => {
  return [
    { title: "Top | ISURIDE" },
    { name: "description", content: "目的地まで椅子で快適に移動しましょう" },
  ];
};

const ClientRequest: FC = () => {
  const { data } = useRequest();
  const requestStatus = data?.status ?? "IDLE";
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
};

export default function ClientRequestWrapper() {
  return (
    <div className="h-full flex flex-col">
      <ClientRequest />
    </div>
  );
}
