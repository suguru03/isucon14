import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [{ title: "ISUCON14" }, { name: "description", content: "isucon14" }];
};

export default function ClientLayout() {
  return (
    <>
      <h1 className="text-3xl">ISUCON 14 ride</h1>
    </>
  );
}
