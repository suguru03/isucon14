import type { MetaFunction } from "@remix-run/node";
import { useMemo } from "react";
import { List } from "~/components/modules/list/list";
import { Button } from "~/components/primitives/button/button";
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
      <h1 className="text-3xl my-4">椅子一覧</h1>
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => alert("not implemented")}>
          + 追加
        </Button>
      </div>
      <List
        items={chairs}
        keyFn={(chair) => chair.id}
        rowFn={(chair) => (
          <div>
            <span>{chair.name}</span>
            <span className="ms-2 text-sm text-gray-500">{chair.id}</span>
          </div>
        )}
      />
    </section>
  );
}
