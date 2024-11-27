import { FC } from "react";
import { Loading } from "~/components/icon/loading";
import { LocationButton } from "~/components/modules/location-button/location-button";
import { ModalHeader } from "~/components/modules/modal-header/moda-header";
import { Price } from "~/components/modules/price/price";
import { Text } from "~/components/primitives/text/text";
import { Coordinate } from "~/types";

export const Matching: FC<{
  pickup?: Coordinate;
  destLocation?: Coordinate;
  fare?: number;
}> = ({ pickup, destLocation, fare }) => {
  fare = 500;
  return (
    <div className="w-full h-full px-8 flex flex-col items-center justify-center">
      <ModalHeader title="マッチング中" subTitle="椅子をさがしています...">
        <Loading size={120} />
      </ModalHeader>
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
      <Price value={fare} pre="予定運賃" className="mt-6" />
    </div>
  );
};
