import type { MetaFunction } from "@remix-run/node";
import { redirect, ClientActionFunctionArgs, Form } from "@remix-run/react";
import { fetchAppPostRegister } from "~/apiClient/apiComponents";

export const meta: MetaFunction = () => {
  return [
    { title: "Regiter | ISURIDE" },
    { name: "description", content: "ユーザー登録" },
  ];
};

export const clientAction = async ({ request }: ClientActionFunctionArgs) => {
  const formData = await request.formData();
  const data = await fetchAppPostRegister({
    body: {
      date_of_birth: String(formData.get("date_of_birth")) ?? "",
      username: String(formData.get("username")) ?? "",
      firstname: String(formData.get("firstname")) ?? "",
      lastname: String(formData.get("lastname")) ?? "",
    },
  });
  return redirect(
    `/client?access_token=${data.access_token}&user_id=${data.id}`,
  );
};

export default function ClientRegister() {
  return (
    <>
      <Form
        className="mx-auto p-6 bg-white rounded-lg shadow-md space-y-4 flex flex-col"
        method="POST"
      >
        <label htmlFor="username">Username:</label>
        <input
          type="text"
          id="username"
          name="username"
          className="mt-1 p-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <label htmlFor="firstname">Firstname:</label>
        <input
          type="text"
          id="firstname"
          name="firstname"
          className="mt-1 p-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <label htmlFor="lastname">Lastname:</label>
        <input
          type="text"
          id="lastname"
          name="lastname"
          className="mt-1 p-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <label htmlFor="date_of_birth">dateOfBirth:</label>
        <input
          type="text"
          id="date_of_birth"
          name="date_of_birth"
          className="mt-1 p-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <button type="submit">登録</button>
      </Form>
    </>
  );
}
