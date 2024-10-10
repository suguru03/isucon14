import type { MetaFunction } from "@remix-run/node";
import { Avatar } from "~/components/primitives/avatar/avatar";
import { useUser } from "../../contexts/user-context";
import { Header } from "~/components/primitives/header/header";

export const meta: MetaFunction = () => {
  return [
    { title: "お客様情報 | ISURIDE" },
    { name: "description", content: "お客様情報" },
  ];
};

export default function Index() {
  const { name } = useUser();

  return (
    <>
      <Header backTo={"/client"} />
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
