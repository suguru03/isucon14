import { Form } from "@remix-run/react";
import { MouseEventHandler, useCallback, useState } from "react";
import colors from "tailwindcss/colors";
import { fetchAppPostRideEvaluation } from "~/apiClient/apiComponents";
import { ToIcon } from "~/components/icon/to";
import { Button } from "~/components/primitives/button/button";
import { Rating } from "~/components/primitives/rating/rating";
import { Text } from "~/components/primitives/text/text";
import { useClientAppRequestContext } from "~/contexts/user-context";

export const Arrived = ({ onEvaluated }: {
  onEvaluated: () => void
}) => {
  const { auth, payload } = useClientAppRequestContext();
  const [rating, setRating] = useState(0);

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
      } catch (e) {
        console.error("ERROR: %o", e)
      }
      onEvaluated();
    },
    [auth, payload, rating, onEvaluated],
  );

  return (
    <Form className="h-full flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-6 mb-14">
        <ToIcon className="size-[90px]" color={colors.red[500]} />
        <Text size="xl">目的地に到着しました</Text>
      </div>
      <div className="flex flex-col items-center w-80">
        <Text className="mb-4">今回のドライブはいかがでしたか？</Text>
        <Rating
          name="rating"
          rating={rating}
          setRating={setRating}
          className="mb-10"
        />
        <Button
          variant="primary"
          type="submit"
          onClick={onClick}
          className="w-full mt-1"
        >
          評価してドライビングを完了
        </Button>
      </div>
    </Form>
  );
};
