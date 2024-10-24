import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [{ title: "ISUCON14" }, { name: "description", content: "isucon14" }];
};

export default function Index() {
  return (
    <section className="flex-1 mx-4">
      <h1 className="text-3xl my-4">Provider Home</h1>
    </section>
  );
}
