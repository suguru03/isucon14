import type { MetaFunction } from "@remix-run/node";
import type { FC } from "react";
import { useRequest } from "../../contexts/user-context";
import { Arrived } from "./requestComponent/arrived";
import { Reception } from "./requestComponent/reception";
import { Running } from "./requestComponent/running";
import { NavLink } from "@remix-run/react";
import { Avatar } from "~/components/primitives/avatar/avatar";
import { Header } from "~/components/primitives/header/header";

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
    <>
      <Header className="absolute top-0 z-10">
        <NavLink to="/client/account">
          <Avatar size="sm" />
        </NavLink>
      </Header>
      <ClientRequest />
    </>
  );
}
