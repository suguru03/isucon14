import type { MetaFunction } from "@remix-run/node";
import { NavLink, Outlet } from "@remix-run/react";
import { Avatar } from "../components/primitives/avatar/avatar";

export const meta: MetaFunction = () => {
  return [{ title: "ISUCON14" }, { name: "description", content: "isucon14" }];
};

export default function Index() {
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
      <nav className="h-16 border-t flex items-center justify-end px-6">
        <NavLink
          to="/client/history"
          className={({ isActive }) =>
            isActive ? "pointer-events-none" : "text-blue-600 hover:underline"
          }
        >
          履歴
        </NavLink>
      </nav>
    </div>
  );
}
