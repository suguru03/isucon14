import type { MetaFunction } from "@remix-run/node";
import { Outlet } from "@remix-run/react";
import { CircleIcon } from "~/components/icon/circle";
import { FooterNavigation } from "~/components/modules/footer-navigation/footer-navigation";
import { DriverProvider } from "../../contexts/driver-context";

export const meta: MetaFunction = () => {
  return [
    { title: "プロバイダー | ISURIDE" },
    { name: "description", content: "isucon14" },
  ];
};

export default function DriverLayout() {
  return (
    // TODO: Use provider-context
    <DriverProvider>
      <Outlet />
      <FooterNavigation
        navigationMenus={[
          { icon: CircleIcon, link: "/provider/", label: "HOME" },
          { icon: CircleIcon, link: "/provider/sales", label: "SALES" },
        ]}
      />
    </DriverProvider>
  );
}
