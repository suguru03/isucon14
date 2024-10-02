import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { Avatar } from "~/components/primitives/avatar/avatar";
import { ButtonLink } from "~/components/primitives/button/button";
import { useClient } from "../client/userProvider";

export const meta: MetaFunction = () => {
  return [{ title: "ISUCON14" }, { name: "description", content: "isucon14" }];
};

export default function Index() {
  const { name } = useClient();

  return (
    <div className="font-sans p-4 flex flex-col h-full">
      <Link to="/client" className="text-blue-600 hover:underline self-start">
        戻る
      </Link>
      <div className="flex items-center my-4">
        <Avatar />
        <h1 className="text-3xl ms-4">{name}</h1>
      </div>
      <div className="flex-1">
        <h2>支払い情報</h2>
        <p>aaaaaa</p>
      </div>
      <div className="flex justify-center mb-4">
        <ButtonLink to="/client/contact">お問い合わせ</ButtonLink>
      </div>
    </div>
  );
}
