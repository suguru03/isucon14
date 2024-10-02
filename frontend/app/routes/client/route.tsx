import type { MetaFunction } from "@remix-run/node";
import { NavLink, Outlet } from "@remix-run/react";
import { useEffect, useState } from "react";
import { FooterNavigation } from "~/components/FooterNavigation";
import { CircleIcon } from "~/components/icon/circle";
import { Avatar } from "~/components/primitives/avatar/avatar";
import { UserProvider, type AccessToken } from "./userProvider";

export const meta: MetaFunction = () => {
  return [{ title: "ISUCON14" }, { name: "description", content: "isucon14" }];
};

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

const ClientOutlet = () => {
  const [accessToken, setAccessToken] = useState<AccessToken>();
  useEffect(() => {
    const localStorageAccessToken = localStorage.getItem("access_token");
    if (localStorageAccessToken !== null) {
      setAccessToken(localStorageAccessToken);
    }
  }, []);
  if (accessToken === undefined) {
    return <></>;
  } else {
    return (
      <UserProvider accessToken={accessToken}>
        <Outlet />
      </UserProvider>
    );
  }
};

export default function ClientLayout() {
  return (
    <div className="font-sans flex flex-col h-screen">
      <ClientHeader />
      <div className="flex-1">
        <ClientOutlet />
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
