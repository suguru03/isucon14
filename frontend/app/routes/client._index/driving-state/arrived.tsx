import { Form } from "@remix-run/react";
import { MouseEventHandler, useCallback, useEffect, useState } from "react";
import colors from "tailwindcss/colors";
import { fetchAppPostRideEvaluation } from "~/apiClient/apiComponents";
import { PinIcon } from "~/components/icon/pin";
import { Price } from "~/components/modules/price/price";
import { Button } from "~/components/primitives/button/button";
import { ClickableRating } from "~/components/primitives/rating/clickable-rating";
import { Text } from "~/components/primitives/text/text";
import { useUserContext } from "~/contexts/user-context";

import confetti from "canvas-confetti";

export const Arrived = ({ onEvaluated }: { onEvaluated: () => void }) => {
  const { auth, payload = {} } = useUserContext();
  const [rating, setRating] = useState(0);
  const { fare } = payload;

  const onClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      e.preventDefault();
      try {
        void fetchAppPostRideEvaluation({
          headers: {
            Authorization: `Bearer ${auth?.accessToken}`,
          },
          pathParams: {
            rideId: payload?.ride_id ?? "",
          },
          body: {
            evaluation: rating,
          },
        });
      } catch (error) {
        console.error(error);
      }
      onEvaluated();
    },
    [auth, payload, rating, onEvaluated],
  );

  useEffect(() => {
    void confetti({
      origin: { y: 0.7 },
      spread: 60,
      colors: [
        colors.yellow[500],
        colors.cyan[300],
        colors.green[500],
        colors.indigo[500],
        colors.red[500],
      ],
    });
  }, []);

  return (
    <Form className="w-full h-full flex flex-col items-center justify-center max-w-md mx-auto">
      <div className="flex flex-col items-center gap-6 mb-14">
        <PinIcon className="size-[90px]" color={colors.red[500]} />
        <Text size="xl" bold>
          目的地に到着しました
        </Text>
      </div>
      <div className="flex flex-col items-center w-80">
        <Text className="mb-4">今回のドライブはいかがでしたか？</Text>
        <ClickableRating
          name="rating"
          rating={rating}
          setRating={setRating}
          className="mb-10"
        />
        {fare && <Price pre="運賃" value={fare} className="mb-6"></Price>}
        <Button
          variant="primary"
          type="submit"
          onClick={onClick}
          className="w-full"
        >
          評価して料金を支払う
        </Button>
      </div>
    </Form>
  );
};
