import type { MetaFunction } from "@remix-run/node";
import { Link, Outlet, useMatch } from "@remix-run/react";
import { ProviderProvider } from "~/contexts/owner-context";

export const meta: MetaFunction = () => {
  return [
    { title: "オーナー | ISURIDE" },
    { name: "description", content: "isucon14" },
  ];
};

const Tab = () => {
  const tabs = [
    { key: "index", label: "椅子一覧", to: "/owner/" },
    { key: "sales", label: "売上", to: "/owner/sales" },
  ] as const;

  const match = useMatch({ path: "/owner/", end: true });

  return (
    <nav className="border-b">
      <ul className="flex">
        {tabs.map((tab) => (
          <li
            key={tab.key}
            className={
              tab.key === (match ? "index" : "sales")
                ? "border-b-4 border-black"
                : ""
            }
          >
            <Link to={tab.to} className="px-4 py-2">
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
          <h1 className="text-3xl my-12 mb-8">
            {/* TODO: ISURIDEロゴ */}
            [ISURIDE] オーナー向け管理画面
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
