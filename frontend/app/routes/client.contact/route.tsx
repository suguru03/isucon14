import type { MetaFunction } from "@remix-run/node";
import { Header } from "~/components/primitives/header/header";

export const meta: MetaFunction = () => {
  return [
    { title: "お問い合わせ | ISURIDE" },
    { name: "description", content: "お問い合わせ" },
  ];
};

export default function Index() {
  return (
    <>
      <Header backTo={"/client"} />
      <section className="flex-1 mx-4">
        <h2 className="text-2xl my-4">お問い合わせ</h2>
      </section>
    </>
  );
}
