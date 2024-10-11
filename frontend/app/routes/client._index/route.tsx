import type { MetaFunction } from "@remix-run/node";
import type { FC } from "react";
import { useClientAppRequestContext } from "../../contexts/user-context";
import { Arrived } from "./requestComponent/arrived";
import { Reception } from "./requestComponent/reception";
import { Running } from "./requestComponent/running";

export const meta: MetaFunction = () => {
  return [
    { title: "Top | ISURIDE" },
    { name: "description", content: "目的地まで椅子で快適に移動しましょう" },
  ];
};

const ClientRequest: FC = () => {
  const data = useClientAppRequestContext();
  const requestStatus = data?.status ?? "IDLE";
  const destinationCoordinate = data?.payload?.coordinate?.destination;
  switch (requestStatus) {
    case "IDLE":
    case "MATCHING":
    case "DISPATCHING":
      return <Reception status={requestStatus} />;
    case "DISPATCHED":
      return (
        <Running
          status={requestStatus}
          destinationCoordinate={destinationCoordinate}
        />
      );
    case "CARRYING":
      return (
        <Running
          status={requestStatus}
          destinationCoordinate={destinationCoordinate}
        />
      );
    case "ARRIVED":
      return <Arrived />;
    default:
      return <div>unexpectedStatus: {requestStatus}</div>;
  }
};

export default function ClientRequestWrapper() {
  return (
    <>
      <ClientRequest />
    </>
  );
}
