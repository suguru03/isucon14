import { FC } from "react";
import { CarGreenIcon } from "~/components/icon/car-green";
import { LocationButton } from "~/components/modules/location-button/location-button";
import { PriceText } from "~/components/modules/price-text/price-text";
import { Text } from "~/components/primitives/text/text";
import { useClientAppRequestContext } from "~/contexts/user-context";
import { Coordinate } from "~/types";

export const Carrying: FC<{
  pickup?: Coordinate;
  destLocation?: Coordinate;
  fare?: number;
}> = ({ pickup, destLocation }) => {

  const {payload} = useClientAppRequestContext();
  const fare = payload?.fare;
  const stat = payload?.chair?.stats;

  return (
    <div className="w-full h-full px-8 flex flex-col items-center justify-center">
      <CarGreenIcon className="size-[76px] mb-4" />
      <Text size="xl" className="mb-6">
        快適なドライビングをお楽しみください
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
      <p className="mt-8">
        {typeof fare === "number" ? (
          <>
            運賃: <PriceText tagName="span" value={fare} />
          </>
        ) : null}
      </p>
      {stat?.total_evaluation_avg && <p>評価: {stat?.total_evaluation_avg}</p>}
        {stat?.total_rides_count && <p>配車回数: {stat?.total_rides_count}</p>}
    </div>
  );
};
