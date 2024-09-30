import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [{ title: "ISUCON14" }, { name: "description", content: "isucon14" }];
};

export default function ClientLayout() {
  return (
    <div className="h-full text-center content-center bg-blue-200">Map</div>
  );
}
