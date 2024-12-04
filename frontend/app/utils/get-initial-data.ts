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

const initialData = __INITIAL_DATA__;

export const getOwners = (): InitialOwner[] => {
  return (
    initialData?.owners?.map((owner) => ({
      ...owner,
    })) ?? []
  );
};

export const getSimulateChair = (index?: number): InitialChair | undefined => {
  return index
    ? initialData?.simulatorChairs[index]
    : initialData?.simulatorChairs[0];
};

export const getSimulateChairFromToken = (
  token: string,
): InitialChair | undefined => {
  return initialData?.simulatorChairs.find((c) => c.token === token);
};
