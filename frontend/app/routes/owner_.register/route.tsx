import type { MetaFunction } from "@remix-run/node";
import { Link, useNavigate } from "@remix-run/react";
import { useState } from "react";
import { fetchOwnerPostOwners } from "~/apiClient/apiComponents";
import { Button } from "~/components/primitives/button/button";
import { TextInput } from "~/components/primitives/form/text";
import { FormFrame } from "~/components/primitives/frame/form-frame";
import { Text } from "~/components/primitives/text/text";
import { isClientApiError } from "~/types";

export const meta: MetaFunction = () => {
  return [
    { title: "Regiter | Owner | ISURIDE" },
    { name: "description", content: "オーナー登録" },
  ];
};

export default function ProviderRegister() {
  const [ownerName, setOwnerName] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const navigate = useNavigate();

  const handleOnClick = async () => {
    try {
      // client validation
      if (!ownerName) {
        setErrorMessage("オーナー名を入力してください");
        return;
      }
      if (ownerName.length > 30) {
        setErrorMessage("オーナー名は30文字以内で入力してください");
        return;
      }
      await fetchOwnerPostOwners({
        body: {
          name: ownerName ?? "",
        },
      });

      navigate("/owner");
    } catch (e) {
      console.error(e);
      if (isClientApiError(e)) {
        if (
          e.stack.status === 500 &&
          e.stack.payload.includes("Duplicate entry")
        ) {
          setErrorMessage(
            "オーナーの登録に失敗しました。入力されたオーナー名はすでに登録済みです",
          );
        } else {
          setErrorMessage(`オーナーの登録に失敗しました。[${e.stack.payload}]`);
        }
      } else if (e instanceof Error) {
        setErrorMessage(`オーナーの登録に失敗しました。[${e.message}]`);
      } else {
        setErrorMessage("オーナーの登録に失敗しました。[Unknown Error]");
      }
    }
  };

  return (
    <FormFrame>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">オーナー登録</h1>
        {errorMessage && (
          <Text variant="danger" className="mt-2">
            {errorMessage}
          </Text>
        )}
      </div>
      <div className="flex flex-col gap-8">
        <div>
          <TextInput
            id="ownerName"
            name="ownerName"
            label="オーナー名"
            onChange={setOwnerName}
          />
        </div>
        <Button
          variant="primary"
          className="text-lg mt-6"
          onClick={() => void handleOnClick()}
        >
          登録
        </Button>
        <p className="text-center">
          <Link to="/owner/login" className="text-blue-600 hover:underline">
            ログイン
          </Link>
        </p>
      </div>
    </FormFrame>
  );
}
