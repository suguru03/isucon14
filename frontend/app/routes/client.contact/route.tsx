import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [{ title: "ISUCON14" }, { name: "description", content: "isucon14" }];
};

export default function Index() {
  return (
    <div className="font-sans p-4">
      <Link
        to="/client/account"
        className="text-blue-600 hover:underline self-start"
      >
        戻る
      </Link>
      <h1 className="text-3xl my-4">お問い合わせ</h1>
    </div>
  );
}
