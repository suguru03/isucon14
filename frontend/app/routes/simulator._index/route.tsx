import { useState } from "react";

import { List } from "~/components/modules/list/list";
import { ListItem } from "~/components/modules/list/list-item";
import { PulldownSelector } from "~/components/primitives/menu/pulldown";
import {
  SimulatorChair,
  useSimulatorContext,
} from "~/contexts/simulator-context";
import { ChairInfo } from "./ChairInfo";

export default function Index() {
  const { owners } = useSimulatorContext();
  const ownerNames = [...owners].map((o) => ({ id: o.id, name: o.name }));
  const getOwnerById = (id: string) => {
    return owners.find((o) => o.id === id);
  };

  const [targetOwner, setTargetOwner] = useState<{ chair?: SimulatorChair }>(
    owners[0],
  );

  return (
    <div className="p-6">
      <PulldownSelector
        className="mb-3"
        id="ownerNames"
        label="オーナー"
        items={ownerNames}
        onChange={(id) =>
          setTargetOwner(getOwnerById(id) ?? { chair: undefined })
        }
      />
      {targetOwner.chair !== undefined ? (
        <List>
          <ListItem key={targetOwner.chair.id}>
            <ChairInfo chair={targetOwner.chair} />
          </ListItem>
        </List>
      ) : null}
    </div>
  );
}
