import { FC } from "react";
import { ChairIcon } from "~/components/icon/chair";
import { HumanIcon } from "~/components/icon/human";
import { ChairInformation } from "~/components/modules/chair-information/chair-information";
import { LocationButton } from "~/components/modules/location-button/location-button";
import { ModalHeader } from "~/components/modules/modal-header/moda-header";
import { Price } from "~/components/modules/price/price";
import { Text } from "~/components/primitives/text/text";
import { useClientAppRequestContext } from "~/contexts/user-context";

export const Pickup: FC = () => {
  const { payload = {} } = useClientAppRequestContext();
  const { chair, fare, coordinate } = payload;
  return (
    <div className="w-full h-full flex flex-col items-center justify-center max-w-md mx-auto">
      <ModalHeader title="目的地に向けて出発します" subTitle="お座りください">
        <div className="relative w-[160px] h-[160px]">
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
      {chair && <ChairInformation className="mb-8" chair={chair} />}
      <LocationButton
        label="現在地"
        location={coordinate?.pickup}
        className="w-full"
        disabled
      />
      <Text size="xl">↓</Text>
      <LocationButton
        label="目的地"
        location={coordinate?.destination}
        className="w-full"
        disabled
      />
      {fare && <Price pre="運賃" value={fare} className="mt-8"></Price>}
    </div>
  );
};
