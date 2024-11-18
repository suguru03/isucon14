import { createContext, ReactNode, useContext } from "react";
import { RideStatus } from "~/apiClient/apiSchemas";
import { Coordinate } from "~/types";

export type Owner = {
  name: string;
  id: string;
  token: string;
};

export type Chair = {
  id: string; // GET /owner/chairs with Owner Cookie
  name: string; // GET /owner/chairs with Owner Cookie
  model: string; // GET /owner/chairs with Owner Cookie
  token: string; // from static JSON
  active: boolean; // GET /owner/chairs with Owner Cookie
  status: RideStatus; // GET /charis/notifications with chair Cookie
  coordinates?: Coordinate // Set via application
};

type ChairsByOnwer = Map<Owner, Chair[]>;

function useChairsByOwner(): ChairsByOnwer {
  // TODO: API 経由で取得するようにする
  return new Map<Owner, Chair[]>([
    [
      { 
        name: "o1",
        id: "01JCNCC4EGP0KKB6GKMC03G3BN",
        token: "DUMMY_TOKEN",
      }, 
      [
        {
          id: "01JCNCECH24Q07MBGNXVN14QSQ",
          name: "o1-c1",
          model: "アーロンチェア",
          token: "DUMMY_TOKEN",
          active: true,
          status: "MATCHING",
        },
        {
          id: "01JCNCG65ZXZX2EF16MREZ8M4V",
          name: "o1-c2",
          model: "コンテッサ",
          token: "DUMMY_TOKEN",
          active: false,
          status: "CARRYING",
        },
        {
          id: "01JCNCH3FWEWKE6N6KF1447R2Y",
          name: "o1-c3",
          model: "エルゴヒューマン",
          token: "DUMMY_TOKEN",
          active: true,
          status: "COMPLETED",
        },
      ],
    ],
    [
      { 
        name: "o2",
        id: "01JCNCKD1BNQ167RKX5K3J5Y9F",
        token: "DUMMY_TOKEN_2",
      }, 
      [
        {
          id: "01JCNCKSGGPF5P659FX66YVSC6",
          name: "o2-c1",
          model: "アクトチェア",
          token: "DUMMY_TOKEN",
          active: false,
          status: "ENROUTE",
        },
      ],
    ]
  ]);
}

const SimulatorContext = createContext<ChairsByOnwer>(new Map());

export function SimulatorContextProvider(
  {
    children
  } : {
    children: ReactNode
  }
) {
  return (
    <SimulatorContext.Provider value={useChairsByOwner()}>
      {children}
    </SimulatorContext.Provider>
  )
}

export const useSimulatorContext = () => useContext(SimulatorContext);
