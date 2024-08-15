import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: "ISUCON14" },
    { name: "description", content: "isucon14" },
  ];
};

export default function Index() {
  return (
    <div className="font-sans p-4">
      <h1 className="text-3xl">ISUCON 14 root</h1>
    </div>
  );
}
