import type { MetaFunction } from "@remix-run/node";
import { ClientActionFunctionArgs, Form, redirect } from "@remix-run/react";
import { fetchAppPostPaymentMethods } from "~/apiClient/apiComponents";
import { Button } from "~/components/primitives/button/button";

export const meta: MetaFunction = () => {
  return [
    { title: "Regiter | ISURIDE" },
    { name: "description", content: "ユーザー登録" },
  ];
};

export const clientAction = async ({ request }: ClientActionFunctionArgs) => {
  const formData = await request.formData();
  await fetchAppPostPaymentMethods({
    body: {
      token: String(formData.get("payment-token")),
    },
  });
  return redirect(`/client`);
};

export default function ClientRegister() {
  return (
    <>
      <Form className="p-4 flex flex-col gap-4" method="POST">
        <div>
          <label htmlFor="payment-token">決済トークンを入力:</label>
          <input
            type="text"
            id="payment-token"
            name="payment-token"
            className="mt-1 p-2 w-full border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <Button type="submit">登録</Button>
      </Form>
    </>
  );
}
