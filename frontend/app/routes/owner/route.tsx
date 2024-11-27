import type { MetaFunction } from "@remix-run/node";
import { Outlet } from "@remix-run/react";
import { CircleIcon } from "~/components/icon/circle";
import { FooterNavigation } from "~/components/modules/footer-navigation/footer-navigation";
import { OwnerHeader } from "~/components/modules/owner-header/owner-header";
import { MainFrame } from "~/components/primitives/frame/frame";
import { ProviderProvider } from "~/contexts/owner-context";

export const meta: MetaFunction = () => {
  return [
    { title: "オーナー | ISURIDE" },
    { name: "description", content: "isucon14" },
  ];
};

export default function ProviderLayout() {
  return (
    <ProviderProvider>
      <MainFrame>
        <OwnerHeader />
        <Outlet />
        <FooterNavigation
          menus={[
            { icon: CircleIcon, link: "/owner/", label: "HOME" },
            { icon: CircleIcon, link: "/owner/sales", label: "SALES" },
          ]}
        />
      </MainFrame>
    </ProviderProvider>
  );
}
