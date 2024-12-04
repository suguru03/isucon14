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

type initialDataType =
  | {
      owners: {
        id: string;
        name: string;
        token: string;
      }[];
      simulatorChairs: {
        id: string;
        owner_id: string;
        name: string;
        model: string;
        token: string;
      }[];
    }
  | undefined;

const initialData = __INITIAL_DATA__ as initialDataType;

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
