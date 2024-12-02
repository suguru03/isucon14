import type { MetaFunction } from "@remix-run/node";
import { Link, useNavigate } from "@remix-run/react";
import { useState } from "react";
import { Button } from "~/components/primitives/button/button";
import { TextInput } from "~/components/primitives/form/text";
import { FormFrame } from "~/components/primitives/frame/form-frame";
import { getOwners } from "~/utils/get-initial-data";

export const meta: MetaFunction = () => {
  return [
    { title: "Login | Owner | ISURIDE" },
    { name: "description", content: "オーナーログイン" },
  ];
};

export default function OwnerRegister() {
  const [sessionToken, setSessionToken] = useState<string>();
  const navigate = useNavigate();

  const presetOwners = getOwners();

  const handleOnClick = () => {
    document.cookie = `owner_session=${sessionToken}; path=/`;
    navigate("/owner");
  };

  return (
    <FormFrame>
      <h1 className="text-2xl font-semibold mb-8">オーナーログイン</h1>
      <div className="flex flex-col gap-8">
        <div>
          <TextInput
            id="sessionToken"
            name="sessionToken"
            label="セッショントークン"
            value={sessionToken}
            onChange={setSessionToken}
          />
          <details className="mt-3 ps-2">
            <summary>presetから選択</summary>
            <ul className="list-disc ps-4">
              {presetOwners.map((preset) => (
                <li key={preset.id}>
                  <button
                    className="text-blue-600 hover:underline"
                    onClick={() => setSessionToken(preset.token)}
                  >
                    {preset.name}
                  </button>
                </li>
              ))}
            </ul>
          </details>
        </div>
        <Button
          variant="primary"
          className="text-lg mt-6"
          onClick={() => void handleOnClick()}
        >
          ログイン
        </Button>
        <p className="text-center">
          <Link to="/owner/register" className="text-blue-600 hover:underline">
            新規登録
          </Link>
        </p>
      </div>
    </FormFrame>
  );
}
