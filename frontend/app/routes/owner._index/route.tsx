import type { MetaFunction } from "@remix-run/node";
import { FC } from "react";
import { OwnerGetChairsResponse } from "~/apiClient/apiComponents";
import { ChairIcon } from "~/components/icon/chair";
import { Badge } from "~/components/primitives/badge/badge";
import { Text } from "~/components/primitives/text/text";
import { useClientProviderContext } from "~/contexts/owner-context";

export const meta: MetaFunction = () => {
  return [{ title: "ISUCON14" }, { name: "description", content: "isucon14" }];
};

const formatDateTime = (timestamp: number) => {
  const d = new Date(timestamp);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}`;
};

const Chair: FC<{ chair: OwnerGetChairsResponse["chairs"][number] }> = ({
  chair,
}) => {
  return (
    <>
      <div className="flex justify-between items-center">
        <div className="w-full">
          <p className="text-lg ms-2">{chair.name}</p>
          <dl className="flex gap-6 mt-3 px-2 w-full.">
            <div className="w-1/2">
              <dt className="text-sm text-gray-500">モデル</dt>
              <dd className="flex items-center">
                <ChairIcon model={chair.model} className="shrink-0 size-6" />
                <span className="truncate ms-2">{chair.model}</span>
              </dd>
            </div>
            <div className="w-1/4">
              <dt className="text-sm text-gray-500">総走行距離</dt>
              <dd className="text-end">{chair.total_distance}</dd>
            </div>
            <div className="w-1/4">
              <dt className="text-sm text-gray-500">登録日</dt>
              <dd>{formatDateTime(chair.registered_at)}</dd>
            </div>
          </dl>
        </div>
        <div className="shrink-0">
          <Badge>{chair.active ? "稼働中" : "停止中"}</Badge>
        </div>
      </div>
    </>
  );
};

export default function Index() {
  const { chairs } = useClientProviderContext();

  return (
    <>
      {chairs?.length ? (
        <div>
          <table className="border text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="border px-4 py-2">ID</th>
                <th className="border px-4 py-2">名前</th>
                <th className="border px-4 py-2">状態</th>
                <th className="border px-4 py-2">モデル</th>
                <th className="border px-4 py-2">総走行距離</th>
                <th className="border px-4 py-2">登録日</th>
              </tr>
            </thead>
            <tbody>
              {chairs.map((chair) => (
                <tr key={chair.id}>
                  <td className="p-4 border">{chair.id}</td>
                  <td className="p-4 border">{chair.name}</td>
                  <td className="p-4 border">{chair.active}</td>
                  <td className="p-4 border">
                    <div className="flex">
                      <ChairIcon
                        model={chair.model}
                        className="shrink-0 size-6 me-2"
                      />
                      {chair.model}
                    </div>
                  </td>
                  <td className="p-4 border text-right font-mono">
                    {chair.total_distance}
                  </td>
                  <td className="p-4 border">
                    {formatDateTime(chair.registered_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Text>登録されている椅子がありません</Text>
      )}
    </>
  );
}
