import { Outlet } from "@remix-run/react";
import { FooterNavigation } from "~/components/modules/footer-navigation/footer-navigation";
import { CircleIcon } from "~/components/icon/circle";
import { UserProvider } from "../../contexts/user-context";

export default function ClientLayout() {
  return (
    <UserProvider>
      <Outlet />
      <FooterNavigation
        navigationMenus={[
          { icon: CircleIcon, link: "/client", label: "ride" },
          { icon: CircleIcon, link: "/client/history", label: "history" },
        ]}
      />
    </UserProvider>
  );
}
