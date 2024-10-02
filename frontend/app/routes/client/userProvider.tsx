import { ReactNode, createContext, useContext } from "react";

export type AccessToken = string;

type User = {
  id: string;
  name: string;
  accessToken: AccessToken;
};

const userContext = createContext<Partial<User>>({});

export const UserProvider = ({
  children,
  accessToken,
}: {
  children: ReactNode;
  accessToken: string;
}) => {
  /**
   * openapi上にfetchするものがないので一旦仮置き
   * TODO:通信を行い、APIのデータを取得する
   */
  const fetchedValue = { id: "fetched-id", name: "fetched-name", accessToken };

  return (
    <userContext.Provider value={fetchedValue}>{children}</userContext.Provider>
  );
};

export const useUser = () => useContext(userContext);
