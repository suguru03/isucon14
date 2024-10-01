import type { MetaFunction } from "@remix-run/node";
import { Outlet } from "@remix-run/react";
import { FooterNavigation } from "~/components/FooterNavigation";
import { CircleIcon } from "~/components/icon/circle";

export const meta: MetaFunction = () => {
  return [{ title: "ISUCON14" }, { name: "description", content: "isucon14" }];
};

export default function DriverLayout() {
  return (
    <div className="font-sans h-screen flex relative flex-col">
      <div className="flex-1">
        <Outlet />
      </div>
      <FooterNavigation
        navigationMenus={[
          { icon: CircleIcon, link: "/driver/", label: "ride" },
          { icon: CircleIcon, link: "/driver/history", label: "history" },
        ]}
      />
    </div>
  );
}
