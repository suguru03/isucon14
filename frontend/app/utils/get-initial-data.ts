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

type InitialUser = {
  id: string;
  username: string;
  firstname: string;
  lastname: string;
  token: string;
  date_of_birth: string;
  invitation_code: string;
};

type initialDataType =
  | {
      owners: InitialOwner[];
      simulatorChairs: InitialChair[];
      users: InitialUser[];
    }
  | undefined;

const initialData = __INITIAL_DATA__ as initialDataType;

export const getOwners = (): InitialOwner[] => {
  return initialData?.owners ?? [];
};

export const getUsers = (): InitialUser[] => {
  return initialData?.users ?? [];
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
