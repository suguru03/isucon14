import { useSearchParams } from "@remix-run/react";
import { ReactNode, createContext, useContext } from "react";
import { useChairGetNotification } from "~/apiClient/apiComponents";
import { ChairRequest } from "~/apiClient/apiSchemas";

export type AccessToken = string;

type User = {
  id: string;
  name: string;
  accessToken: AccessToken;
};

const driverContext = createContext<Partial<User>>({});
const requestContext = createContext<ChairRequest | undefined>(undefined);

const RequestProvider = ({
  children,
  accessToken,
}: {
  children: ReactNode;
  accessToken: string;
}) => {
  const { data, error, isLoading } = useChairGetNotification({
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "text/event-stream",
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error occurred: {JSON.stringify(error, null, 2)}</div>;
  if (data === undefined) return <div>notifiaction is undefined</div>;

  /**
   * TODO: SSE処理
   */
  return (
    <requestContext.Provider value={data}>{children}</requestContext.Provider>
  );
};

export const DriverProvider = ({ children }: { children: ReactNode }) => {
  const [searchParams] = useSearchParams();
  const accessToken = searchParams.get("access_token") ?? undefined;
  const id = searchParams.get("user_id") ?? undefined;

  if (accessToken === undefined || id === undefined) {
    return <div>must set access_token and user_id</div>;
  }

  return (
    <driverContext.Provider
      value={{
        id,
        accessToken,
        name: "ISUCON太郎",
      }}
    >
      <RequestProvider accessToken={accessToken}>{children}</RequestProvider>
    </driverContext.Provider>
  );
};

export const useDriver = () => useContext(driverContext);
export const useRequest = () => useContext(requestContext);
