import { PriceText } from "~/components/modules/price-text/price-text";
import { ChairModel } from "~/components/primitives/chair-model/chair-model";
import { useClientAppRequestContext } from "~/contexts/user-context";

export const RideInformation = () => {
  const { payload } = useClientAppRequestContext();
  const fare = payload?.fare;
  const stat = payload?.chair?.stats;

  return (
    <>
      <p className="mt-8">
        {typeof fare === "number" ? (
          <>
            運賃: <PriceText tagName="span" value={fare} />
          </>
        ) : null}
      </p>
      {stat?.total_evaluation_avg && <p>評価: {stat?.total_evaluation_avg}</p>}
      {stat?.total_rides_count && <p>配車回数: {stat?.total_rides_count}</p>}
    </>
  );
};

export const DrivingCarModel = () => {
  const { payload } = useClientAppRequestContext();
  const chair = payload?.chair;
  return <ChairModel model={chair?.model ?? ""} className="size-[76px] mb-4" />;
};
