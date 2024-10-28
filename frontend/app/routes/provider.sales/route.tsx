import type { MetaFunction } from "@remix-run/node";
import { useMemo, useState } from "react";
import { ProviderGetSalesResponse } from "~/apiClient/apiComponents";
import { Tab } from "~/components/primitives/tab/tab";
import { useClientProviderContext } from "~/contexts/provider-context";

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
  
  const {payload} = useClientProviderContext()

  const items = useMemo(() => {
    return tab === "chair"
    ? (payload?.sales?.chairs?.map((item) => ({
      name: item.name ?? "",
      sales: item.sales ?? 0,
    })) ?? [])
    : (payload?.sales?.models?.map((item) => ({
      name: item.model ?? "",
      sales: item.sales ?? 0,
    })) ?? [])
  }, [payload, tab])

  const switchTab = (tab: Tab) => {
    setTab(tab);
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
