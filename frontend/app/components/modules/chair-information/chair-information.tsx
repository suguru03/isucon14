import { ComponentProps, FC } from "react";
import { twMerge } from "tailwind-merge";
import { ChairIcon } from "~/components/icon/chair";
import { Text } from "~/components/primitives/text/text";
import { ClientAppChair } from "~/types";

export const ChairInformation: FC<
  { chair: ClientAppChair } & ComponentProps<"div">
> = ({ chair, className, ...props }) => {
  chair.stats = { total_evaluation_avg: 500, total_rides_count: 100 };
  return (
    <div
      className={twMerge(
        "flex flex-row items-center space-x-3 px-6 py-4 bg-neutral-100 rounded-md w-full",
        className,
      )}
      {...props}
    >
      <div className="rounded-full bg-neutral-300 p-4">
        <ChairIcon model={chair.model} width={40} height={40}></ChairIcon>
      </div>
      <div className="flex flex-col space-y-1">
        <Text tagName="span" bold>
          {chair.name}
          <Text tagName="span" size="xs">
            （{chair.model}）
          </Text>
        </Text>
        {chair.stats?.total_evaluation_avg && (
          <Text tagName="span" size="xs" className="text-neutral-500">
            <Text tagName="span" className="pr-1">
              評価:
            </Text>
            {chair.stats?.total_evaluation_avg}
          </Text>
        )}
        {chair.stats?.total_rides_count && (
          <Text tagName="span" size="xs" className="text-neutral-500">
            <Text tagName="span" className="pr-1">
              これまでの配車数:
            </Text>
            {chair.stats?.total_rides_count}
          </Text>
        )}
      </div>
    </div>
  );
};
