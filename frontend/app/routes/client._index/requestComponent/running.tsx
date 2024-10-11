import { Coordinate } from "~/apiClient/apiSchemas";
import { CarGreenIcon } from "~/components/icon/car-green";
import { CarYellowIcon } from "~/components/icon/car-yellow";
import { LocationButton } from "~/components/modules/location-button/location-button";
import { Text } from "~/components/primitives/text/text";
import type { RequestProps } from "~/components/request/type";

export const Running = ({
  status,
  destinationCoordinate,
}: RequestProps<
  "DISPATCHED" | "CARRYING",
  { destinationCoordinate?: Coordinate }
>) => {
  return (
    <div className="w-full h-full px-8 flex flex-col items-center justify-center">
      {status === "DISPATCHED" ? (
        <CarYellowIcon className="size-[76px] mb-4" />
      ) : (
        <CarGreenIcon className="size-[76px] mb-4" />
      )}
      <Text size="xl" className="mb-6">
        {status === "DISPATCHED"
          ? "車両が到着しました"
          : "快適なドライビングをお楽しみください"}
      </Text>
      <LocationButton type="from" position="here" className="w-80" />
      <Text size="xl">↓</Text>
      <LocationButton
        type="to"
        position={destinationCoordinate ?? "here"}
        className="w-80"
      />
    </div>
  );
};
