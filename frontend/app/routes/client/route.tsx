import { Outlet } from "@remix-run/react";
import { FooterNavigation } from "~/components/modules/footer-navigation/footer-navigation";
import { MainFrame } from "~/components/primitives/frame/frame";
import { ClientProvider } from "../../contexts/client-context";

export default function ClientLayout() {
  return (
    <MainFrame>
      <ClientProvider>
        <Outlet />
      </ClientProvider>
      <FooterNavigation />
    </MainFrame>
  );
}
