import { ToIcon } from "~/components/icon/to";
import { Button } from "~/components/primitives/button/button";
import { Text } from "~/components/primitives/text/text";

export const Arrive = ({ onComplete }: { onComplete: () => void }) => {
  const handleCompleteClick = () => {
    onComplete();
  };

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-6 mb-14">
        <ToIcon className="size-[90px] " />
        <Text size="xl">目的地に到着しました</Text>
      </div>
      <Button
        type="submit"
        variant="primary"
        className="w-full mt-1"
        onClick={handleCompleteClick}
      >
        ドライビングを完了
      </Button>
    </div>
  );
};
