import type { MetaFunction } from "@remix-run/node";
import { Outlet } from "@remix-run/react";
import { CircleIcon } from "~/components/icon/circle";
import { FooterNavigation } from "~/components/modules/footer-navigation/footer-navigation";
import { ProviderProvider } from "~/contexts/provider-context";

export const meta: MetaFunction = () => {
  return [
    { title: "プロバイダー | ISURIDE" },
    { name: "description", content: "isucon14" },
  ];
};

export default function ProviderLayout() {
  return (
    // TODO: Use provider-context
    <ProviderProvider>
      <Outlet />
      <FooterNavigation
        navigationMenus={[
          { icon: CircleIcon, link: "/provider/", label: "HOME" },
          { icon: CircleIcon, link: "/provider/sales", label: "SALES" },
        ]}
      />
    </ProviderProvider>
  );
}
