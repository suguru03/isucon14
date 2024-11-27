import type { MetaFunction } from "@remix-run/node";
import { FC } from "react";
import { OwnerGetChairsResponse } from "~/apiClient/apiComponents";
import { ChairIcon } from "~/components/icon/chair";
import { List } from "~/components/modules/list/list";
import { ListItem } from "~/components/modules/list/list-item";
import { Badge } from "~/components/primitives/badge/badge";
import { Text } from "~/components/primitives/text/text";
import { useClientProviderContext } from "~/contexts/owner-context";

export const meta: MetaFunction = () => {
  return [{ title: "ISUCON14" }, { name: "description", content: "isucon14" }];
};

const formatDateTime = (timestamp: number) => {
  const d = new Date(timestamp);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes()}`;
};

const Chair: FC<{ chair: OwnerGetChairsResponse["chairs"][number] }> = ({
  chair,
}) => {
  return (
    <>
      <div className="flex justify-between items-center">
        <div>
          <p className="text-lg ms-2">{chair.name}</p>
          <dl className="flex gap-6 mt-3 px-2">
            <div className="w-36">
              <dt className="text-sm text-gray-500">モデル</dt>
              <dd className="flex">
                <ChairIcon model={chair.model} className="shrink-0" />
                <span className="truncate ms-2">{chair.model}</span>
              </dd>
            </div>
            <div className="w-20">
              <dt className="text-sm text-gray-500">総走行距離</dt>
              <dd className="text-end">{chair.total_distance}</dd>
            </div>
            <div className="ms-12">
              <dt className="text-sm text-gray-500">登録日</dt>
              <dd>{formatDateTime(chair.registered_at)}</dd>
            </div>
          </dl>
        </div>
        <Badge>{chair.active ? "稼働中" : "停止中"}</Badge>
      </div>
    </>
  );
};

export default function Index() {
  const { chairs } = useClientProviderContext();

  return (
    <section className="flex-1 overflow-hidden flex flex-col mx-4">
      <div className="flex items-center border-b my-4">
        <h1 className="text-2xl pb-4">椅子一覧</h1>
      </div>
      {chairs?.length ? (
        <List className="overflow-auto">
          {chairs.map((chair) => (
            <ListItem key={chair.id}>
              <Chair chair={chair} />
            </ListItem>
          ))}
        </List>
      ) : (
        <Text>登録されている椅子がありません</Text>
      )}
    </section>
  );
}
