import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [{ title: "ISUCON14" }, { name: "description", content: "isucon14" }];
};

export default function Index() {
  return (
    <div className="font-sans p-4">
      <h1 className="text-3xl">ISUCON 14 root</h1>
      <ul className="mt-4 list-disc ps-8">
        <li>
          <Link to="/client" className="text-blue-600 hover:underline">
            Client page
          </Link>
        </li>
        <li>
          <Link to="/driver" className="text-blue-600 hover:underline">
            Driver page
          </Link>
        </li>
      </ul>
    </div>
  );
}
