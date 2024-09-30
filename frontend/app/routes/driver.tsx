import type { MetaFunction } from "@remix-run/node";
import { Outlet } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [{ title: "ISUCON14" }, { name: "description", content: "isucon14" }];
};

export default function Index() {
  return (
    <div className="font-sans h-screen flex flex-col">
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}
