import { useNavigate } from "@remix-run/react";
import { useState } from "react";
import { fetchOwnerPostOwners } from "~/apiClient/apiComponents";
import { Button } from "~/components/primitives/button/button";
import { ErrorMessage } from "~/components/primitives/error-message/error-message";
import { isClientApiError } from "~/types";
export default function OwnerRegisterForm() {
  const [ownerName, setOwnerName] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const navigate = useNavigate();
  return (
    <div>
      <label htmlFor="ownerName">ownerNameを入力:</label>
      <input
        type="text"
        id="ownerName"
        name="ownerName"
        className="mt-1 p-2 w-full border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        onChange={(e) => setOwnerName(e.target.value)}
      />
      {errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
      <Button
        onClick={() => {
          (async () => {
            // client validation
            if (!ownerName) {
              setErrorMessage("ownerNameを入力してください");
              return;
            }
            if (ownerName.length > 30) {
              setErrorMessage("ownerNameは30文字以内で入力してください");
              return;
            }

            await fetchOwnerPostOwners({
              body: {
                name: ownerName ?? "",
              },
            });
            navigate("/owner");
          })().catch((e) => {
            console.error(e);
            if (isClientApiError(e)) {
              if (
                e.stack.status === 500 &&
                e.stack.payload.includes("Duplicate entry")
              ) {
                setErrorMessage(
                  "オーナーの登録に失敗しました。入力されたownerNameはすでに登録済みです",
                );
              } else {
                setErrorMessage(
                  `オーナーの登録に失敗しました。[${e.stack.payload}]`,
                );
              }
            } else if (e instanceof Error) {
              setErrorMessage(`オーナーの登録に失敗しました。[${e.message}]`);
            } else {
              setErrorMessage("オーナーの登録に失敗しました。[Unknown Error]");
            }
          });
          return;
        }}
      >
        登録
      </Button>
    </div>
  );
}
