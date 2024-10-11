import { useCallback } from "react";
import { useChairPostRequestDepart } from "~/apiClient/apiComponents";
import { ChairRequest } from "~/apiClient/apiSchemas";
import { Button } from "~/components/primitives/button/button";
import { Text } from "~/components/primitives/text/text";
import { useDriver } from "~/contexts/driver-context";

export const Pickup = ({ data }: { data?: ChairRequest }) => {
  const driver = useDriver();
  const { mutate: postChairRequestDepart } = useChairPostRequestDepart();

  const handleDeparture = useCallback(() => {
    postChairRequestDepart({
      headers: {
        Authorization: `Bearer ${driver.accessToken}`,
      },
      pathParams: {
        requestId: data?.request_id ?? "",
      },
    });
  }, [data, driver, postChairRequestDepart]);

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
          <Button onClick={() => handleDeparture()}>出発</Button>
        ) : null}
      </div>
    </>
  );
};
