import type { MetaFunction } from "@remix-run/node";
import { ClientActionFunctionArgs, Form, redirect } from "@remix-run/react";
import {
  fetchChairPostRegister,
  fetchProviderPostRegister,
} from "~/apiClient/apiComponents";
import { TextInput } from "~/components/primitives/form/text";

export const meta: MetaFunction = () => {
  return [
    { title: "Regiter | ISURIDE" },
    { name: "description", content: "チェア登録" },
  ];
};

export const clientAction = async ({ request }: ClientActionFunctionArgs) => {
  const formData = await request.formData();

  const provider = await fetchProviderPostRegister({
    body: {
      name: String(formData.get("provider_name")) ?? "",
    },
  });

  const chair = await fetchChairPostRegister({
    headers: {
      Authorization: `Bearer ${provider.access_token}`,
    },
    body: {
      name: String(formData.get("chair_name")) ?? "",
      model: String(formData.get("chair_model")) ?? "",
    },
  });
  return redirect(`/driver?access_token=${chair.access_token}&id=${chair.id}`);
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
            id="provide_name"
            name="provide_name"
            label="Provider name:"
            required
          />
          <TextInput
            id="chair_name"
            name="chair_name"
            label="Chair name:"
            required
          />
          <TextInput
            id="chair_model"
            name="chair_model"
            label="Chair model:"
            required
          />
        </div>
        <button type="submit">登録</button>
      </Form>
    </>
  );
}
