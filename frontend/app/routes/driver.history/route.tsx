import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [
    { title: "椅子履歴 | ISURIDE" },
    { name: "description", content: "配椅子履歴" },
  ];
};

export default function Index() {
  return (
    <div className="font-sans p-4">
      <Link to="/driver" className="text-blue-600 hover:underline">
        戻る
      </Link>
      <h1 className="text-3xl my-4">履歴</h1>
      <ul className="list-disc ps-8">
        <li>2024/08/24</li>
      </ul>
    </div>
  );
}
