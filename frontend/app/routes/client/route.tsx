import { Outlet } from "@remix-run/react";
import { HistoryIcon } from "~/components/icon/history";
import { IsurideIcon } from "~/components/icon/isuride";
import { FooterNavigation } from "~/components/modules/footer-navigation/footer-navigation";
import { MainFrame } from "~/components/primitives/frame/frame";
import { UserProvider } from "../../contexts/user-context";

export default function ClientLayout() {
  return (
    <MainFrame>
      <UserProvider>
        <Outlet />
      </UserProvider>
      <FooterNavigation
        menus={[
          {
            icon: IsurideIcon,
            link: "/client",
            label: "RIDE",
          },
          {
            icon: HistoryIcon,
            link: "/client/history",
            label: "LOG",
          },
        ]}
      />
    </MainFrame>
  );
}
