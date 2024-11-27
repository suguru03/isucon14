import { FC } from "react";
import { ChairIcon } from "~/components/icon/chair";
import { HumanIcon } from "~/components/icon/human";
import { LocationButton } from "~/components/modules/location-button/location-button";
import { ModalHeader } from "~/components/modules/modal-header/moda-header";
import { RideInformation } from "~/components/modules/ride-information/ride-information";
import { Text } from "~/components/primitives/text/text";
import { useClientAppRequestContext } from "~/contexts/user-context";
import { Coordinate } from "~/types";

export const Pickup: FC<{
  pickup?: Coordinate;
  destLocation?: Coordinate;
  fare?: number;
}> = ({ pickup, destLocation }) => {
  const { payload } = useClientAppRequestContext();
  const chair = payload?.chair;

  return (
    <div className="w-full h-full px-8 flex flex-col items-center justify-center">
      <ModalHeader title="椅子が到着しました" subTitle="ご乗車ください">
        <div className="relative w-[160px]">
          <HumanIcon
            width={110}
            height={110}
            className="absolute left-0 bottom-[-5px]"
          />
          <ChairIcon
            model={chair?.model ?? ""}
            width={60}
            height={60}
            className="absolute bottom-0 right-0 animate-shake"
          />
        </div>
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
      <RideInformation />
    </div>
  );
};
