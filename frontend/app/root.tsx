import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
} from "@remix-run/react";
import "./tailwind.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MainFrame } from "./components/primitives/frame/frame";
import { ErrorMessage } from "./components/primitives/error-message/error-message";

export function Layout({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient();

  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="overscroll-none bg-gray-100">
        <QueryClientProvider client={queryClient}>
          <MainFrame>{children}</MainFrame>
        </QueryClientProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <ErrorMessage>
      {isRouteErrorResponse(error)
        ? `${error.status} ${error.statusText}`
        : error instanceof Error
          ? error.message
          : "Unknown Error"}
    </ErrorMessage>
  );
}

export function HydrateFallback() {
  return <></>;
}
