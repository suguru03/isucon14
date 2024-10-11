import { ChairRequest } from "~/apiClient/apiSchemas";
import { Button } from "~/components/primitives/button/button";
import { Text } from "~/components/primitives/text/text";

export const Pickup = ({ data }: { data?: ChairRequest }) => {
  return (
    <>
      <div className="h-full text-center content-center bg-blue-200">Map</div>
      <div className="flex flex-col items-center my-8 gap-8">
        {data?.status === "DISPATCHING" ? (
          <Text>
            <span className="font-bold mx-1">{data?.user.name}</span>
            さんの出発地点へ向かっています
          </Text>
        ) : (
          <Text>
            <span className="font-bold mx-1">{data?.user.name}</span>
            さんの出発地点へ到着しました
          </Text>
        )}
        <p>{"from -> to"}</p>
        {data?.status === "DISPATCHED" ? (
          <Button onClick={() => {}}>出発</Button>
        ) : null}
      </div>
    </>
  );
};
