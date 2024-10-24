import type { MetaFunction } from "@remix-run/node";
import { useState } from "react";
import { ProviderGetSalesResponse } from "~/apiClient/apiComponents";
import { Tab } from "~/components/primitives/tab/tab";

const DUMMY_DATA: ProviderGetSalesResponse = {
  total_sales: 8087,
  chairs: [
    { id: "chair-a", name: "椅子A", sales: 999 },
    { id: "chair-b", name: "椅子B", sales: 999 },
  ],
  models: [
    { model: "モデルA", sales: 999 },
    { model: "モデルB", sales: 999 },
  ],
};

export const meta: MetaFunction = () => {
  return [{ title: "ISUCON14" }, { name: "description", content: "isucon14" }];
};

export default function Index() {
  const tabs = [
    { key: "chair", label: "椅子別" },
    { key: "model", label: "モデル別" },
  ] as const;

  type Tab = (typeof tabs)[number]["key"];
  const [tab, setTab] = useState<Tab>("chair");

  // dummy data
  const [items, setItems] = useState<{ name: string; sales: number }[]>(
    DUMMY_DATA.chairs?.map((item) => ({
      name: item.name ?? "",
      sales: item.sales ?? 0,
    })) ?? [],
  );

  const switchTab = (tab: Tab) => {
    setTab(tab);
    setItems(
      tab === "chair"
        ? (DUMMY_DATA.chairs?.map((item) => ({
            name: item.name ?? "",
            sales: item.sales ?? 0,
          })) ?? [])
        : (DUMMY_DATA.models?.map((item) => ({
            name: item.model ?? "",
            sales: item.sales ?? 0,
          })) ?? []),
    );
  };

  return (
    <section className="flex-1 mx-4">
      <h1 className="text-3xl my-4">Provider Sales</h1>
      <Tab tabs={tabs} activeTab={tab} onTabClick={switchTab} />
      <ul>
        {items.map((item) => (
          <li
            key={item.name}
            className="px-4 py-3 border-b flex justify-between"
          >
            <span>{item.name}</span>
            <span>{item.sales} 円</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
