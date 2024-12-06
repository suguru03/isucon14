import type { MetaFunction } from "@remix-run/node";
import { useNavigate } from "@remix-run/react";
import colors from "tailwindcss/colors";
import { AccountSwitchIcon } from "~/components/icon/account-switch";
import { Button } from "~/components/primitives/button/button";

export const meta: MetaFunction = () => {
  return [
    { title: "User | ISURIDE" },
    { name: "description", content: "ユーザーページ" },
  ];
};

export default function Index() {
  const navigate = useNavigate();

  return (
    <section className="mx-8 flex-1">
      <h2 className="text-xl my-6">ユーザー</h2>
      <Button
        className="w-full flex items-center justify-center "
        onClick={() => navigate("/client/login")}
      >
        <AccountSwitchIcon className="me-1" fill={colors.neutral[600]} />
        ユーザーを切り替える
      </Button>
    </section>
  );
}
