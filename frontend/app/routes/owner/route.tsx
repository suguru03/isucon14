import type { MetaFunction } from "@remix-run/node";
import { Link, Outlet, useMatches } from "@remix-run/react";
import { twMerge } from "tailwind-merge";
import { IsurideIcon } from "~/components/icon/isuride";
import { OwnerProvider } from "~/contexts/owner-context";

export const meta: MetaFunction = () => {
  return [
    { title: "オーナー | ISURIDE" },
    { name: "description", content: "isucon14" },
  ];
};

const tabs = [
  { key: "index", label: "椅子", to: "/owner" },
  { key: "sales", label: "売上", to: "/owner/sales" },
] as const;

const Tab = () => {
  const matches = useMatches();
  const activeTab = matches[2]?.pathname.split("/").at(-1) || "index";

  return (
    <nav className="flex after:w-full after:border-b after:border-gray-300">
      <ul className="flex shrink-0">
        {tabs.map((tab) => (
          <li
            key={tab.key}
            className={twMerge([
              "rounded-tl-md rounded-tr-md",
              tab.key === activeTab
                ? "border border-b-transparent"
                : "border-l-transparent border-t-transparent border-r-transparent border",
            ])}
          >
            <Link to={tab.to} className="block px-8 py-3">
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default function OwnerLayout() {
  return (
    <OwnerProvider>
      <div className="bg-neutral-100 flex xl:justify-center">
        <div className="p-6 xl:p-10 h-screen flex flex-col overflow-x-hidden w-full max-w-6xl bg-white">
          <h1 className="flex items-baseline text-3xl mb-6">
            <IsurideIcon className="me-2" width={40} height={40} />
            オーナー様向け管理画面
          </h1>
          <Tab />
          <div className="flex-1 overflow-auto pt-8 pb-16 max-w-7xl xl:flex justify-center">
            <Outlet />
          </div>
        </div>
      </div>
    </OwnerProvider>
  );
}
