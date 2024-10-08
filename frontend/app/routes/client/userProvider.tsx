import { useSearchParams } from "@remix-run/react";
import { ReactNode, createContext, useContext } from "react";
import {
  useAppGetNotification,
  AppGetNotificationError,
} from "~/apiClient/apiComponents";
import { AppRequest } from "~/apiClient/apiSchemas";

export type AccessToken = string;

type User = {
  id: string;
  name: string;
  accessToken: AccessToken;
};

const userContext = createContext<Partial<User>>({});
const requestContext = createContext<{
  data?: AppRequest;
  error?: AppGetNotificationError;
  isLoading: boolean;
}>({ isLoading: false });

const RequestProvider = ({
  children,
  accessToken,
}: {
  children: ReactNode;
  accessToken: string;
}) => {
  let { data, error, isLoading } = useAppGetNotification({
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "text/event-stream",
    },
  });

  // react-queryでstatusCodeが取れない && 現状statusCode:204はBlobで帰ってくる
  if (data instanceof Blob) {
    data = undefined;
  }

  if (error === null) {
    error = undefined;
  }

  /**
   * TODO: SSE処理
   */

  return (
    <requestContext.Provider value={{ data, error, isLoading }}>
      {children}
    </requestContext.Provider>
  );
};

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [searchParams] = useSearchParams();
  const accessToken = searchParams.get("access_token") ?? undefined;
  const id = searchParams.get("user_id") ?? undefined;

  if (accessToken === undefined || id === undefined) {
    return <div>must set access_token and user_id</div>;
  }

  return (
    <userContext.Provider
      value={{
        id,
        accessToken,
        name: "ISUCON太郎",
      }}
    >
      <RequestProvider accessToken={accessToken}>{children}</RequestProvider>
    </userContext.Provider>
  );
};

export const useUser = () => useContext(userContext);
export const useRequest = () => useContext(requestContext);
