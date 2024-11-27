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

  const viewTypes = [
    { key: "chair", label: "椅子別" },
    { key: "model", label: "モデル別" },
  ] as const;

  const [viewType, setViewType] =
    useState<(typeof viewTypes)[number]["key"]>("chair");

  const { sales, chairs } = useClientProviderContext();

  const items = useMemo(() => {
    if (!sales || !chairs) {
      return [];
    }
    const chairModelMap = new Map(chairs.map((c) => [c.id, c.model]));
    return viewType === "chair"
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
  }, [sales, chairs, viewType]);

  const updateDate = (key: "since" | "until", value: string) => {
    setSearchParams((prev) => {
      prev.set(key, value);
      return prev;
    });
  };

  return (
    <div className="min-w-[800px]">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <DateInput
            id="sales-since"
            name="since"
            size="sm"
            className="w-48 ms-[2px]"
            onChange={(e) => updateDate("since", e.target.value)}
          />
          →
          <DateInput
            id="sales-until"
            name="until"
            size="sm"
            className="w-48"
            onChange={(e) => updateDate("until", e.target.value)}
          />
        </div>
        {sales ? null : null}
      </div>
      {sales ? (
        <div className="flex flex-col mt-4">
          <div className="flex items-center justify-between">
            <div className="my-4 space-x-4">
              {viewTypes.map((type) => (
                <label htmlFor={`sales-view-type-${type.key}`} key={type.key}>
                  <input
                    type="radio"
                    id={`sales-view-type-${type.key}`}
                    checked={type.key === viewType}
                    onChange={() => setViewType(type.key)}
                    className="me-1"
                  />
                  {type.label}
                </label>
              ))}
            </div>
            <Price pre="合計" value={sales.total_sales} className="font-bold" />
          </div>
          <table className="text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-gray-500">
                <th className="px-4 py-3 text-left">
                  {viewType === "chair" ? "椅子" : "モデル"}
                </th>
                <th className="px-4 py-3 text-left">売上</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.key}
                  className="border-b hover:bg-gray-50 transition"
                >
                  <td className="p-4">
                    <div className="flex items-center">
                      <ChairIcon
                        model={item.model}
                        className="shrink-0 size-6 me-2"
                      />
                      <span>{item.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
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
        <Text className="px-2 py-8">該当するデータがありません</Text>
      )}
    </div>
  );
}
