import type { MetaFunction } from "@remix-run/node";
import { Outlet, useNavigate } from "@remix-run/react";
import { useState } from "react";
import { Tab } from "~/components/primitives/tab/tab";
import { ProviderProvider } from "~/contexts/owner-context";

export const meta: MetaFunction = () => {
  return [
    { title: "オーナー | ISURIDE" },
    { name: "description", content: "isucon14" },
  ];
};

export default function ProviderLayout() {
  const tabs = [
    { key: "index", label: "椅子一覧", to: "/owner/" },
    { key: "sales", label: "売上", to: "/owner/sales" },
  ] as const;

  type Tab = (typeof tabs)[number]["key"];
  const [tab, setTab] = useState<Tab>("index");

  const navigate = useNavigate();

  return (
    <ProviderProvider>
      <div className="bg-white flex justify-center">
        <div className="md:container h-screen flex flex-col">
          <h1 className="text-3xl my-12 mb-4">
            {/* TODO: ISURIDEロゴ */}
            [ISURIDE] オーナー向け管理画面
          </h1>
          <Tab
            tabs={tabs}
            activeTab={tab}
            className=""
            onTabClick={(t) => {
              setTab(t);
              // TODO:
              const tab = tabs.find((tab) => tab.key === t);
              if (tab) {
                navigate(tab.to);
              }
            }}
          />
          <div className="flex-1 overflow-auto pt-8 pb-16">
            <Outlet />
          </div>
        </div>
      </div>
    </ProviderProvider>
  );
}
