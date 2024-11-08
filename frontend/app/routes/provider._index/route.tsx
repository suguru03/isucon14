import type { MetaFunction } from "@remix-run/node";
import { useMemo } from "react";
import { PriceText } from "~/components/modules/price-text/price-text";
import { useClientProviderContext } from "~/contexts/provider-context";

export const meta: MetaFunction = () => {
  return [{ title: "ISUCON14" }, { name: "description", content: "isucon14" }];
};

export default function Index() {
  const { sales } = useClientProviderContext();

  const chairs = useMemo(() => {
    return sales?.chairs ?? [];
  }, [sales]);

  return (
    <section className="flex-1 mx-4">
      <h1 className="text-3xl my-4">Provider Home</h1>
      <ul>
        {chairs.map((item) => (
          <li
            key={item.name}
            className="px-4 py-3 border-b flex justify-between"
          >
            <span>{item.id}</span>
            <span>{item.name}</span>
            <PriceText tagName="span" value={item.sales} />
          </li>
        ))}
      </ul>
    </section>
  );
}
