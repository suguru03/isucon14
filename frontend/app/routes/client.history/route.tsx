import type { MetaFunction } from "@remix-run/node";
import { useAppGetRides } from "~/apiClient/apiComponents";
import { DateText } from "~/components/modules/date-text/date-text";
import { List } from "~/components/modules/list/list";
import { ListItem } from "~/components/modules/list/list-item";
import { PriceText } from "~/components/modules/price-text/price-text";

export const meta: MetaFunction = () => {
  return [
    { title: "履歴 | ISURIDE" },
    { name: "description", content: "配椅子履歴" },
  ];
};

export default function Index() {
  const { data } = useAppGetRides({});

  return (
    <section className="flex-1 mx-4">
      <h2 className="text-2xl my-4">履歴</h2>
      <List className="my-16">
        {data &&
          data.rides.map((item) => (
            <ListItem key={item.id} className="flex justify-between">
              <span>
                <DateText value={item.completed_at} tagName="span" />
                <span className="ms-4">
                  ({item.pickup_coordinate.latitude},{" "}
                  {item.pickup_coordinate.longitude}) → (
                  {item.destination_coordinate.latitude},{" "}
                  {item.destination_coordinate.longitude})
                </span>
              </span>
              <PriceText value={item.fare} />
            </ListItem>
          ))}
      </List>
    </section>
  );
}
