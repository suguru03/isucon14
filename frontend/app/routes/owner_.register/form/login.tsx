import { useNavigate } from "@remix-run/react";
import { useState } from "react";
import { Button } from "~/components/primitives/button/button";

export default function OwnerLoginForm() {
  const [sessionToken, setSessionToken] = useState<string>();
  const navigate = useNavigate();
  return (
    <div>
      <label htmlFor="sessionToken">sessionTokenを入力:</label>
      <input
        type="text"
        id="sessionToken"
        name="sessionToken"
        className="mt-1 p-2 w-full border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        onChange={(e) => setSessionToken(e.target.value)}
      />
      <Button
        onClick={() => {
          document.cookie = `owner_session=${sessionToken}; path=/`;
          navigate("/owner");
        }}
      >
        ログイン
      </Button>
    </div>
  );
}
