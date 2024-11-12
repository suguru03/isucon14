import { useNavigate } from "@remix-run/react";
import { useState } from "react";
import { fetchOwnerPostOwners } from "~/apiClient/apiComponents";
import { Button } from "~/components/primitives/button/button";
export default function OwnerRegisterForm() {
  const [ownerName, setOwnerName] = useState<string>();
  const navigate = useNavigate();
  return (
    <div>
      <p>新しいオーナーを作成する</p>
      <input
        type="text"
        id="sessionToken"
        name="sessionToken"
        className="mt-1 p-2 w-full border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        onChange={(e) => setOwnerName(e.target.value)}
      />
      <Button
        onClick={() => {
          (async () => {
            await fetchOwnerPostOwners({
              body: {
                name: ownerName ?? "",
              },
            });
            navigate("/owner");
          })().catch((e) => console.error(e));
          return;
        }}
      >
        登録
      </Button>
    </div>
  );
}
