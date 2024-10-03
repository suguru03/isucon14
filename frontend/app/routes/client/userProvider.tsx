import { useSearchParams } from "@remix-run/react";
import { ReactNode, createContext, useContext } from "react";

export type AccessToken = string;

type User = {
  id: string;
  name: string;
  accessToken: AccessToken;
};
const userContext = createContext<Partial<User>>({});

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [searchParams] = useSearchParams();
  const accessToken = searchParams.get("access_token") ?? undefined;
  if (accessToken === undefined) {
    return;
  }
  /**
   * TODO: ログイン情報取得処理
   */
  const fetchedValue: User = {
    id: "fetched-id",
    name: "fetched-name",
    accessToken,
  };

  return (
    <userContext.Provider value={fetchedValue}>{children}</userContext.Provider>
  );
};

export const useUser = () => useContext(userContext);
