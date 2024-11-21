import type { MetaFunction } from "@remix-run/node";
import ClientLoginForm from "./form/login";
import PaymentTokenRegisterForm from "./form/payment-register";

export const meta: MetaFunction = () => {
  return [
    { title: "Regiter | ISURIDE" },
    { name: "description", content: "ユーザー登録" },
  ];
};

export default function ClientRegister() {
  return (
    <>
      <ClientLoginForm />
      <PaymentTokenRegisterForm />
    </>
  );
}
