import { createContext, ReactNode, useContext } from "react";

type Owner = {
  name: string;
  id: string;
  token: string;
};

type Chair = {
  id: string;
  name: string;
  model: string;
  activate: boolean;
};

type ChairsByOnwer = Map<Owner, Chair[]>;

function useChairsByOwner(): ChairsByOnwer {
  // // NOTE: 固定値データ？
  // const OWNERS: Owner[] = [];
  // 
  // const [chairsByOwner, setChairsByOwner] = useState<ChairsByOnwer>(new Map());
  // useEffect(() => {
  //   let timeoutId: number;
  //   const polling = () => {
  //     (async () => {
  //       const m: ChairsByOnwer = new Map();
  //       for (const owner of OWNERS) {
  //         const res = await fetchOwnerGetChairs({
  //           //NOTE: Fetch API で headers は禁止ヘッダなので、実行できない
  //           headers: {
  //             'Cookie': `owner_session=${owner.token}`,
  //           }
  //         })
  //         m.set(owner, res.chairs.map(c => ({
  //           id: c.id,
  //           name: c.name,
  //           model: c.model,
  //           activate: c.active,
  //         } satisfies Chair)))
  //       }
  //       setChairsByOwner(m);
  //     })()
  //     .catch((e) => console.error(e));
  //     timeoutId = window.setTimeout(polling, 10000);
  //   }
  //   polling();
  //   return () => window.clearTimeout(timeoutId);
  // })
  // 
  // return chairsByOwner;

  return new Map<Owner, Chair[]>([
    [
      { 
        name: "o1",
        id: "01JCNCC4EGP0KKB6GKMC03G3BN",
        token: "DUMMY_TOKEN_1",
      }, 
      [
        {
          id: "01JCNCECH24Q07MBGNXVN14QSQ",
          name: "o1-c1",
          model: "アーロンチェア",
          activate: true,
        },
        {
          id: "01JCNCG65ZXZX2EF16MREZ8M4V",
          name: "o1-c2",
          model: "コンテッサ",
          activate: true
        },
        {
          id: "01JCNCH3FWEWKE6N6KF1447R2Y",
          name: "o1-c3",
          model: "エルゴヒューマン",
          activate: false
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
          activate: false,
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
