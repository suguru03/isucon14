import type { MetaFunction } from "@remix-run/node";
import { redirect, ClientActionFunctionArgs, Form } from "@remix-run/react";
import { fetchChairPostRegister } from "~/apiClient/apiComponents";

export const meta: MetaFunction = () => {
  return [
    { title: "Regiter | ISURIDE" },
    { name: "description", content: "チェア登録" },
  ];
};

export const clientAction = async ({ request }: ClientActionFunctionArgs) => {
  const formData = await request.formData();
  const data = await fetchChairPostRegister({
    body: {
      model: String(formData.get("model")) ?? "",
      name: String(formData.get("name")) ?? "",
    },
  });
  return redirect(`/driver?access_token=${data.access_token}&id=${data.id}`);
};

export default function DriverRegister() {
  return (
    <>
      <Form
        className="w-full h-full p-4 bg-white rounded-lg shadow-md flex flex-col gap-4"
        method="POST"
      >
        <div>
          <label htmlFor="name">name:</label>
          <input
            type="text"
            id="name"
            name="name"
            className="mt-1 p-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <label htmlFor="model">Model:</label>
          <input
            type="text"
            id="model"
            name="model"
            className="mt-1 p-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <button type="submit">登録</button>
      </Form>
    </>
  );
}
