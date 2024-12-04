type InitialChair = {
  id: string;
  owner_id: string;
  name: string;
  model: string;
  token: string;
};

type InitialOwner = {
  id: string;
  name: string;
  token: string;
};

const initialOwnerData = __INITIAL_OWNER_DATA__;

export const getOwners = (): InitialOwner[] => {
  return (
    initialOwnerData?.owners?.map((owner) => ({
      ...owner,
    })) ?? []
  );
};

export const getSimulateChair = (index?: number): InitialChair | undefined => {
  return index
    ? initialOwnerData?.simulatorChairs[index]
    : initialOwnerData?.simulatorChairs[0];
};

export const getSimulateChairFromToken = (token: string): InitialChair | undefined => {
  return initialOwnerData?.simulatorChairs.find(c => c.token === token);
};
