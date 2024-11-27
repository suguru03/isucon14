import type { MetaFunction } from "@remix-run/node";
import { useSearchParams } from "@remix-run/react";
import { useMemo, useState } from "react";
import { ChairIcon } from "~/components/icon/chair";
import { Price } from "~/components/modules/price/price";
import { DateInput } from "~/components/primitives/form/date";
import { Text } from "~/components/primitives/text/text";
import { useClientProviderContext } from "~/contexts/owner-context";

export const meta: MetaFunction = () => {
  return [{ title: "ISUCON14" }, { name: "description", content: "isucon14" }];
};

export default function Index() {
  const [, setSearchParams] = useSearchParams();

  const tabs = [
    { key: "chair", label: "椅子別" },
    { key: "model", label: "モデル別" },
  ] as const;

  type Tab = (typeof tabs)[number]["key"];
  const [tab, setTab] = useState<Tab>("chair");

  const { sales, chairs } = useClientProviderContext();

  const items = useMemo(() => {
    if (!sales || !chairs) {
      return [];
    }
    const chairModelMap = new Map(chairs.map((c) => [c.id, c.model]));
    return tab === "chair"
      ? sales.chairs.map((item) => ({
          key: item.id,
          name: item.name,
          model: chairModelMap.get(item.id) ?? "",
          sales: item.sales,
        }))
      : sales.models.map((item) => ({
          key: item.model,
          name: item.model,
          model: item.model,
          sales: item.sales,
        }));
  }, [sales, chairs, tab]);

  const updateDate = (key: "since" | "until", value: string) => {
    setSearchParams((prev) => {
      prev.set(key, value);
      return prev;
    });
  };

  const switchTab = (tab: Tab) => {
    setTab(tab);
  };

  return (
    <>
      <div className="flex items-baseline gap-2 mb-2">
        <DateInput
          id="sales-since"
          name="since"
          className="w-48 ms-[2px]"
          onChange={(e) => updateDate("since", e.target.value)}
        />
        →
        <DateInput
          id="sales-until"
          name="until"
          className="w-48"
          onChange={(e) => updateDate("until", e.target.value)}
        />
      </div>
      {sales ? (
        <div className="flex flex-col">
          <div className="flex">
            <Price value={sales.total_sales} className="ms-auto" />
          </div>
          {/* <Tab tabs={tabs} activeTab={tab} onTabClick={switchTab} /> */}
          <div className="self-end mt-6 mb-2">
            <label htmlFor="foo">
              <input
                type="radio"
                id="foo"
                checked={tab === "chair"}
                onChange={() => setTab("chair")}
                className="me-1"
              />
              椅子別
            </label>
            <label htmlFor="bar" className="ms-4">
              <input
                type="radio"
                id="bar"
                checked={tab === "model"}
                onChange={() => setTab("model")}
                className="me-1"
              />
              モデル別
            </label>
          </div>
          <table className="text-sm">
            <thead>
              <tr>
                <th className="border px-4 py-2">name</th>
                <th className="border px-4 py-2">price</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.key} className="hover:bg-gray-50 transition">
                  <td className="border px-4 py-2">
                    <div className="flex items-center">
                      <ChairIcon model={item.model} className="size-8 me-4" />
                      <span>{item.name}</span>
                    </div>
                  </td>
                  <td className="border px-4 py-2 text-right">
                    <div className="flex">
                      <Price value={item.sales} className="ms-auto" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Text className="p-4">該当するデータがありません</Text>
      )}
    </>
  );
}
