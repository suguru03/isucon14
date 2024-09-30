import type { MetaFunction } from "@remix-run/node";
import { NavLink, Outlet } from "@remix-run/react";
import { FooterNavigation } from "~/components/FooterNavigation";
import { CircleIcon } from "~/components/icon/circle";
import { Avatar } from "~/components/primitives/avatar/avatar";

export const meta: MetaFunction = () => {
  return [{ title: "ISUCON14" }, { name: "description", content: "isucon14" }];
};

export default function ClientLayout() {
  return (
    <div className="font-sans flex flex-col h-screen">
      <header className="h-12 bg-slate-400 px-6 flex items-center justify-end">
        <NavLink
          to="/client/account"
          className={({ isActive }) => (isActive ? "pointer-events-none" : "")}
        >
          <Avatar size="sm" />
        </NavLink>
      </header>
      <div className="flex-1">
        <Outlet />
      </div>
      <FooterNavigation
        navigationMenus={[
          { icon: CircleIcon, link: "/client", label: "ride" },
          { icon: CircleIcon, link: "/client/history", label: "history" },
        ]}
      />
    </div>
  );
}
