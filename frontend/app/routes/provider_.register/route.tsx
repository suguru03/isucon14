import type { MetaFunction } from "@remix-run/node";
import { ClientActionFunctionArgs, Form, redirect } from "@remix-run/react";
import { fetchProviderPostRegister } from "~/apiClient/apiComponents";
import { TextInput } from "~/components/primitives/form/text";

export const meta: MetaFunction = () => {
  return [
    { title: "Regiter | ISURIDE" },
    { name: "description", content: "プロバイダー登録" },
  ];
};

export const clientAction = async ({ request }: ClientActionFunctionArgs) => {
  const formData = await request.formData();
  const provider = await fetchProviderPostRegister({
    body: {
      name: String(formData.get("provider_name")) ?? "",
    },
  });
  return redirect(`/provider?id=${provider.id}`);
};

export default function DriverRegister() {
  return (
    <>
      <Form
        className="w-full h-full p-4 bg-white rounded-lg shadow-md flex flex-col gap-4"
        method="POST"
      >
        <div>
          <TextInput
            id="provider_name"
            name="provider_name"
            label="Provider name:"
            required
          />
        </div>
        <button type="submit">登録</button>
      </Form>
    </>
  );
}
