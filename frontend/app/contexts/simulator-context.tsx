import { createContext, ReactNode, useContext } from "react";

type Data = object; //TODO: define schema

const SimulatorContext = createContext<Data>({});

export function SimulatorContextProvider(
  {
    children
  } : {
    children: ReactNode
  }
) {
  const data: Data = {}; //TODO: fetch via API
  
  return (
    <SimulatorContext.Provider value={data}>
      {children}
    </SimulatorContext.Provider>
  )
}

export const useSimulatorContext = () => useContext(SimulatorContext);
