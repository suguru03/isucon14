import { ReactNode, createContext, useContext } from "react";

export type AccessToken = string;

/**
 * フロント側で利用するクライアント情報
 */
type ClientInfo = {
  id: string,
  name: string,
  accessToken: AccessToken
}

const clientContext = createContext<ClientInfo>({
  id: "",
  name: "",
  accessToken: "",
})

export const ClientProvider = ({children, accessToken}: { children: ReactNode, accessToken: string }) => {
  /**
   * openapi上にfetchするものがないので一旦仮置き
   * 想定では、ここで通信を行い子供に流す。
   */
  const fetchedValue = {id: "fetched-id", name: "fetched-name", accessToken}

  return (
  <clientContext.Provider value={fetchedValue}>
    {children}
  </clientContext.Provider>)
}

export const useClient = () => useContext(clientContext);