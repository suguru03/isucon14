type SimulateChair = { id: string; name: string; model: string; token: string };

type SimulateOwner = {
  id: string;
  name: string;
  token: string;
  chair: SimulateChair;
};

type JsonType = { owners: SimulateOwner[] };

const initialOwnerData =
  __INITIAL_OWNER_DATA__ || ({ owners: [] } satisfies JsonType);

export const getOwners = () => {
  return initialOwnerData.owners?.map((owner) => ({
    ...owner,
    chair: owner.chairs[0],
  }));
};

export const getChairs = (ownerId: SimulateOwner["id"]) => {
  return (
    initialOwnerData.owners.find((owner) => owner.id === ownerId)?.chairs ?? []
  );
};

export const getSimulateChair = (): SimulateChair | undefined => {
  return initialOwnerData.owners?.[0]?.chairs?.[0];
};
