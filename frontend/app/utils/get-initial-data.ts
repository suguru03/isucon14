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

type JsonType = { owners: InitialOwner[]; targetSimulatorChair?: InitialChair };

const initialOwnerData = __INITIAL_OWNER_DATA__;

export const getOwners = () => {
  return initialOwnerData?.owners?.map((owner) => ({
    ...owner,
  }));
};

export const getSimulateChair = (): InitialChair | undefined => {
  return initialOwnerData?.targetSimulatorChair;
};
