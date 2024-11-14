import type { MetaFunction } from "@remix-run/node";
import { List } from "~/components/modules/list/list";
import { ButtonLink } from "~/components/primitives/button/button";
import { Text } from "~/components/primitives/text/text";
import { useClientProviderContext } from "~/contexts/provider-context";

export const meta: MetaFunction = () => {
  return [{ title: "ISUCON14" }, { name: "description", content: "isucon14" }];
};

export default function Index() {
  const { chairs } = useClientProviderContext();

  return (
    <section className="flex-1 mx-4">
      <h1 className="text-3xl my-4">椅子一覧</h1>
      <div className="flex items-center justify-end">
        {/* // TODO: UI */}
        <ButtonLink to={"/driver/register"} className="w-32">
          + 追加
        </ButtonLink>
      </div>
      {chairs?.length ? (
        <List
          items={chairs}
          keyFn={(chair) => chair.id}
          rowFn={(chair) => <pre>{JSON.stringify(chair, null, 2)}</pre>} // TODO: UI
        />
      ) : (
        <Text>登録されている椅子がありません</Text>
      )}
    </section>
  );
}
