import type { MetaFunction } from "@remix-run/node";
import { Avatar } from "~/components/primitives/avatar/avatar";
import { useClientAppRequestContext } from "../../contexts/user-context";

export const meta: MetaFunction = () => {
  return [
    { title: "お客様情報 | ISURIDE" },
    { name: "description", content: "お客様情報" },
  ];
};

export default function Index() {
  const user = useClientAppRequestContext();
  const name = user.user?.name;
  return (
    <>
      <section className="flex items-center my-4 mx-4">
        <Avatar />
        <h1 className="text-2xl ms-4">{name}</h1>
      </section>
      <section className="flex-1 mx-4">
        <h2>支払い情報</h2>
        <p>aaaaaa</p>
      </section>
    </>
  );
}
