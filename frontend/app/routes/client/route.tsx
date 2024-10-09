import { NavLink, Outlet } from "@remix-run/react";
import { FooterNavigation } from "~/components/FooterNavigation";
import { CircleIcon } from "~/components/icon/circle";
import { Avatar } from "~/components/primitives/avatar/avatar";
import { UserProvider } from "./userProvider";

const ClientHeader = () => {
  return (
    <header className="h-12 bg-slate-400 px-6 flex items-center justify-end">
      <NavLink
        to="/client/account"
        className={({ isActive }) => (isActive ? "pointer-events-none" : "")}
      >
        <Avatar size="sm" />
      </NavLink>
    </header>
  );
};

export default function ClientLayout() {
  return (
    <div className="font-sans flex flex-col h-screen">
      <ClientHeader />
      <div className="flex-1">
        <UserProvider>
          <Outlet />
        </UserProvider>
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
