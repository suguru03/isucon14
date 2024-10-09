import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [
    { title: "お問い合わせ | ISURIDE" },
    { name: "description", content: "お問い合わせ" },
  ];
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
