import type { MetaFunction } from "@remix-run/node";
import {
  ClientActionFunctionArgs,
  Form,
  json,
  redirect,
  useActionData,
} from "@remix-run/react";
import { fetchAppPostUsers } from "~/apiClient/apiComponents";
import { Button } from "~/components/primitives/button/button";
import { DateInput } from "~/components/primitives/form/date";
import { TextInput } from "~/components/primitives/form/text";
import { FormFrame } from "~/components/primitives/frame/form-frame";
import { Text } from "~/components/primitives/text/text";

export const meta: MetaFunction = () => {
  return [
    { title: "Regiter | ISURIDE" },
    { name: "description", content: "ユーザー登録" },
  ];
};

export const clientAction = async ({ request }: ClientActionFunctionArgs) => {
  const formData = await request.formData();

  // client validation
  const errors: {
    username?: string;
    firstname?: string;
    lastname?: string;
  } = {};

  const username = String(formData.get("username"));
  const firstname = String(formData.get("firstname"));
  const lastname = String(formData.get("lastname"));

  if (username.length > 30) {
    errors.username = "30文字以内で入力してください";
  }
  if (firstname.length > 30) {
    errors.firstname = "30文字以内で入力してください";
  }
  if (lastname.length > 30) {
    errors.lastname = "30文字以内で入力してください";
  }
  if (Object.keys(errors).length > 0) {
    return json({ errors });
  }

  await fetchAppPostUsers({
    body: {
      date_of_birth: String(formData.get("date_of_birth")),
      username: String(formData.get("username")),
      firstname: String(formData.get("firstname")),
      lastname: String(formData.get("lastname")),
    },
  });
  return redirect(`/client/register-payment`);
};

export default function ClientRegister() {
  const actionData = useActionData<typeof clientAction>();

  return (
    <FormFrame>
      <h1 className="text-2xl font-semibold mb-8">ユーザー登録</h1>
      <Form className="flex flex-col gap-8" method="POST">
        <div>
          <TextInput
            id="username"
            name="username"
            label="ユーザー名"
            required
          />
          {actionData?.errors?.username && (
            <Text variant="danger" className="mt-2">
              {actionData?.errors?.username}
            </Text>
          )}
        </div>
        <div className="flex gap-4">
          <div className="w-full">
            <TextInput id="lastname" name="lastname" label="姓" required />
            {actionData?.errors?.lastname && (
              <Text variant="danger" className="mt-2">
                {actionData?.errors?.lastname}
              </Text>
            )}
          </div>
          <div className="w-full">
            <TextInput id="firstname" name="firstname" label="名" required />
            {actionData?.errors?.firstname && (
              <Text variant="danger" className="mt-2">
                {actionData?.errors?.firstname}
              </Text>
            )}
          </div>
        </div>
        <div>
          <DateInput
            id="date_of_birth"
            name="date_of_birth"
            label="誕生日"
            defaultValue="2000-04-01"
            required
          />
        </div>
        <Button type="submit" variant="primary" className="text-lg mt-6">
          登録
        </Button>
      </Form>
    </FormFrame>
  );
}
