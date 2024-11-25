type ChairJsonType = { id: string; name: string; model: string; token: string };
type OwnerJsonType = {
  id: string;
  name: string;
  token: string;
  chair: ChairJsonType;
};
type JsonType = { owners: OwnerJsonType[] };

const initialOwnerData =
  __INITIAL_OWNER_DATA__ || ({ owners: [] } satisfies JsonType);

export const getOwners = (): OwnerJsonType[] => {
  return initialOwnerData.owners?.map((owner) => ({
    ...owner,
    chair: owner.chairs[0],
  }));
};

export const getChairs = (ownerId: OwnerJsonType["id"]) => {
  return (
    initialOwnerData.owners.find((owner) => owner.id === ownerId)?.chairs ?? []
  );
};

export const getTargetChair = () => {
  return initialOwnerData.owners[0].chairs[0];
};
