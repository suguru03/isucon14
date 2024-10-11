import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: "履歴 | ISURIDE" },
    { name: "description", content: "配椅子履歴" },
  ];
};

export default function Index() {
  return (
    <section className="flex-1 mx-4">
      <h2 className="text-2xl my-4">履歴</h2>
      <ul className="list-disc ps-8">
        <li>2024/08/24</li>
      </ul>
    </section>
  );
}
