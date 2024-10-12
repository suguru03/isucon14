import { FC } from "react";
import { CarYellowIcon } from "~/components/icon/car-yellow";
import { LocationButton } from "~/components/modules/location-button/location-button";
import { Text } from "~/components/primitives/text/text";
import { Coordinate } from "~/types";

export const Dispatched: FC<{ destLocation?: Coordinate }> = ({
  destLocation,
}) => {
  return (
    <div className="w-full h-full px-8 flex flex-col items-center justify-center">
      <CarYellowIcon className="size-[76px] mb-4" />
      <Text size="xl" className="mb-6">
        車両が到着しました
      </Text>
      <LocationButton label="現在地" className="w-80" />
      <Text size="xl">↓</Text>
      <LocationButton label="目的地" location={destLocation} className="w-80" />
    </div>
  );
};
