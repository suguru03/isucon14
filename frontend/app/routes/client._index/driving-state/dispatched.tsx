import { FC } from "react";
import { LocationButton } from "~/components/modules/location-button/location-button";
import { Text } from "~/components/primitives/text/text";
import { Coordinate } from "~/types";
import { DrivingCarModel, RideInformation } from "../modal-information";

export const Dispatched: FC<{
  pickup?: Coordinate;
  destLocation?: Coordinate;
  fare?: number;
}> = ({ pickup, destLocation }) => {
  return (
    <div className="w-full h-full px-8 flex flex-col items-center justify-center">
      <DrivingCarModel />
      <Text size="xl" className="mb-6">
        車両が到着しました
      </Text>
      <LocationButton
        label="現在地"
        location={pickup}
        className="w-80"
        disabled
      />
      <Text size="xl">↓</Text>
      <LocationButton
        label="目的地"
        location={destLocation}
        className="w-80"
        disabled
      />
      <RideInformation />
    </div>
  );
};
