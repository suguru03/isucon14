import { useNavigate } from "@remix-run/react";
import { useState } from "react";
import { fetchAppPostPaymentMethods } from "~/apiClient/apiComponents";
import { Button } from "~/components/primitives/button/button";

export default function PaymentTokenRegisterForm() {
  const [paymentToken, setPaymentToken] = useState<string>("");
  const navigate = useNavigate();

  const handleSubmit = async () => {
    try {
      await fetchAppPostPaymentMethods({
        body: {
          token: paymentToken,
        },
      });
      navigate("/client");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      <div>
        <label htmlFor="payment-token">決済トークンを入力:</label>
        <input
          type="text"
          id="payment-token"
          name="payment-token"
          className="mt-1 p-2 w-full border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => setPaymentToken(e.target.value)}
        />
      </div>
      <Button onClick={() => void handleSubmit()}>登録</Button>
    </div>
  );
}
