import type { MetaFunction } from "@remix-run/node";
import { Link, useNavigate } from "@remix-run/react";
import { useState } from "react";
import { Button } from "~/components/primitives/button/button";
import { TextInput } from "~/components/primitives/form/text";
import { FormFrame } from "~/components/primitives/frame/form-frame";

export const meta: MetaFunction = () => {
  return [
    { title: "Regiter | ISURIDE" },
    { name: "description", content: "オーナーログイン" },
  ];
};

export default function ProviderRegister() {
  const [sessionToken, setSessionToken] = useState<string>();
  const navigate = useNavigate();

  const PRESETS = [
    { name: "Owner 1", token: "xxx" },
    { name: "Owner 2", token: "yyy" },
    { name: "Owner 3", token: "zzz" },
  ];

  const handleOnClick = async () => {
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
            onChange={setSessionToken}
          />
          <details className="mt-3 ps-2">
            <summary>presetから選択</summary>
            （未実装）
            <ul className="list-disc ps-4">
              {PRESETS.map((preset) => (
                <li key={preset.name}>
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
