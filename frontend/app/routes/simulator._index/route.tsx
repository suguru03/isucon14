import { useState } from "react";

import { PulldownSelector } from "~/components/primitives/menu/pulldown";
import { Owner, useSimulatorContext } from "~/contexts/simulator-context"
import { ChairInfo } from "./ChairInfo";

export default function Index() {
  const data = useSimulatorContext();
  const ownerNames = [ ...data.keys() ].map(o => o.name);
  const getOwnerByName = (name: string): Owner | undefined => {
    for (const owner of data.keys()) {
      if (owner.name === name) {
        return owner
      }
    }
  }

  const [owner, setOwner] = useState<Owner | undefined>(getOwnerByName(ownerNames[0]));

  return (
    <div className="p-6">
      <PulldownSelector
        className="mb-3"
        id="ownerNames"
        label="オーナー"
        items={ownerNames}
        onChange={(name) => setOwner(getOwnerByName(name))}
      />
      {
        owner !== undefined
        ? data.get(owner)?.map(c => (
          <ChairInfo key={c.id} chair={c} />
        ))
        : null
      }
    </div>
  )
}
