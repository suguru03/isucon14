import { ReactNode, createContext, useContext } from "react";

/**
 * フロント側で利用するクライアント情報
 */
type ClientInfo = {
  id: string,
  access_token: string
}

const clientContext = createContext<ClientInfo>({
  id: "",
  access_token: "",
})

export const clientProvider = ({children, access_token}: { children: ReactNode, access_token:　string }) => {
  /**
   * openapi上にfetchするものがないので一旦仮置き
   */
  const fetchedValue = {id: "fetched", access_token}

  return (
  <clientContext.Provider value={fetchedValue}>
    {children}
  </clientContext.Provider>)
}

export const useUser = () => useContext(clientContext);