import { ComponentProps, FC } from "react";
import { twMerge } from "tailwind-merge";
import { RideStatus } from "~/apiClient/apiSchemas";
import { Text } from "~/components/primitives/text/text";

const StatusList = {
  MATCHING: ["空車", "text-sky-500"],
  ENROUTE: ["迎車", "text-amber-500"],
  PICKUP: ["乗車待ち", "text-amber-500"],
  CARRYING: ["賃走", "text-red-500"],
  ARRIVED: ["到着", "text-emerald-500"],
  COMPLETED: ["完了", "text-emerald-500"],
} as const;

export const SimulatorChairRideStatus: FC<
  ComponentProps<"div"> & {
    currentStatus: RideStatus;
  }
> = ({ currentStatus, className, ...props }) => {
  const [labelName, colorClass] = StatusList[currentStatus];
  return (
    <div className={twMerge("font-bold", colorClass, className)} {...props}>
      <Text className="before:content-['●'] before:mr-1.5" size="sm">
        {labelName}
      </Text>
    </div>
  );
};
