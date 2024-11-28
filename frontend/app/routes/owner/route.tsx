import type { MetaFunction } from "@remix-run/node";
import { Link, Outlet, useMatches } from "@remix-run/react";
import { twMerge } from "tailwind-merge";
import { IsurideIcon } from "~/components/icon/isuride";
import { ProviderProvider } from "~/contexts/owner-context";

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
  const activeTab = matches[2].pathname.split("/").at(-1) || "index";

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

export default function ProviderLayout() {
  return (
    <ProviderProvider>
      <div className="bg-white flex xl:justify-center">
        <div className="px-4 h-screen flex flex-col overflow-x-hidden w-[1280px]">
          <h1 className="flex items-center text-3xl my-12 mb-6">
            <IsurideIcon className="me-2" />
            オーナー向け管理画面
          </h1>
          <Tab />
          <div className="flex-1 overflow-auto pt-8 pb-16 max-w-7xl xl:flex justify-center">
            <Outlet />
          </div>
        </div>
      </div>
    </ProviderProvider>
  );
}
