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
      date_of_birth: String(formData.get("date_of_birth")) ?? "",
      username: String(formData.get("username")) ?? "",
      firstname: String(formData.get("firstname")) ?? "",
      lastname: String(formData.get("lastname")) ?? "",
      chair_model: String(formData.get("chair_model")) ?? "",
      chair_no: String(formData.get("chair_no")) ?? "",
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
          <label htmlFor="date_of_birth">chairModel:</label>
          <input
            type="text"
            id="chair_model"
            name="chair_model"
            className="mt-1 p-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <label htmlFor="date_of_birth">chairNo:</label>
          <input
            type="text"
            id="chair_no"
            name="chair_no"
            className="mt-1 p-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <button type="submit">登録</button>
      </Form>
    </>
  );
}
