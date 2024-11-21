import type { MetaFunction } from "@remix-run/node";
import { ClientActionFunctionArgs, Form, redirect } from "@remix-run/react";
import { fetchAppPostUsers } from "~/apiClient/apiComponents";
import { Button } from "~/components/primitives/button/button";

export const meta: MetaFunction = () => {
  return [
    { title: "Regiter | ISURIDE" },
    { name: "description", content: "ユーザー登録" },
  ];
};

export const clientAction = async ({ request }: ClientActionFunctionArgs) => {
  const formData = await request.formData();
  const data = await fetchAppPostUsers({
    body: {
      date_of_birth: String(formData.get("date_of_birth")),
      username: String(formData.get("username")),
      firstname: String(formData.get("firstname")),
      lastname: String(formData.get("lastname")),
    },
  });
  return redirect(`/client?id=${data.id}`);
};

export default function ClientRegister() {
  return (
    <>
      <Form className="p-4 flex flex-col gap-4" method="POST">
        <div>
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            name="username"
            className="mt-1 p-2 w-full border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <label htmlFor="firstname">Firstname:</label>
          <input
            type="text"
            id="firstname"
            name="firstname"
            className="mt-1 p-2 w-full border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <label htmlFor="lastname">Lastname:</label>
          <input
            type="text"
            id="lastname"
            name="lastname"
            className="mt-1 p-2 w-full border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <label htmlFor="date_of_birth">dateOfBirth:</label>
          <input
            type="text"
            id="date_of_birth"
            name="date_of_birth"
            className="mt-1 p-2 w-full border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <Button type="submit">登録</Button>
      </Form>
    </>
  );
}
