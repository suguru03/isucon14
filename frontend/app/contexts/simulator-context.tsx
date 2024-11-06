import { ReactNode, createContext } from "react";
import type { Coordinate } from "~/apiClient/apiSchemas";

type SimulatorChair = {
  name: string;
  model: string;
  chair_token: string;
  coordinate: Coordinate;
};

type ClientProviderContextType = {
  chairs: SimulatorChair[];
};

const ClientProviderContext = createContext<Partial<ClientProviderContextType>>(
  {},
);

export const SimulatorProvider = ({
  children,
}: {
  children: ReactNode;
  providerId: string;
}) => {
  return (
    <ClientProviderContext.Provider value={{}}>
      {children}
    </ClientProviderContext.Provider>
  );
};

export const useSimulatorContext = () => {
  // TODO: 動的に作成できるようにする
  const testSimulatorContext = {
    chairs: [
      {
        chair_token: "token1",
        coordinate: {
          latitude: 100,
          longitude: 100,
        },
        model: "testModel1",
        name: "testName1",
      },
      {
        chair_token: "token2",
        coordinate: {
          latitude: 200,
          longitude: 200,
        },
        model: "testModel2",
        name: "testName2",
      },
      {
        chair_token: "token3",
        coordinate: {
          latitude: 300,
          longitude: 300,
        },
        model: "testModel3",
        name: "testName3",
      },
    ],
  } satisfies ClientProviderContextType;

  return testSimulatorContext;
};
