import type { MetaFunction } from "@remix-run/node";
import { Outlet } from "@remix-run/react";
import { CircleIcon } from "~/components/icon/circle";
import { FooterNavigation } from "~/components/modules/footer-navigation/footer-navigation";
import { DriverProvider } from "../../contexts/driver-context";

export const meta: MetaFunction = () => {
  return [
    { title: "椅子 | ISURIDE" },
    { name: "description", content: "isucon14" },
  ];
};

export default function DriverLayout() {
  return (
    <DriverProvider>
      <Outlet />
      <FooterNavigation
        navigationMenus={[
          { icon: CircleIcon, link: "/driver/", label: "ride" },
          { icon: CircleIcon, link: "/driver/history", label: "history" },
        ]}
      />
    </DriverProvider>
  );
}
