import { Outlet } from "@remix-run/react";

import { SimulatorContextProvider } from "~/contexts/simulator-context";

export default function Layout() {
  return (
    <SimulatorContextProvider>
      <Outlet />
    </SimulatorContextProvider>
  );
}
