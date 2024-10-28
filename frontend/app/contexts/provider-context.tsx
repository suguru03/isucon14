import { useSearchParams } from "@remix-run/react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ProviderGetSalesResponse,
  fetchProviderGetSales,
} from "~/apiClient/apiComponents";

type ProviderChair = { id: string; name: string };

type ClientProviderRequest = {
  payload?: Partial<{
    chairs: ProviderChair[];
    sales: ProviderGetSalesResponse;
  }>;
  provider?: {
    id?: string;
  };
};

const DUMMY_DATA = {
  total_sales: 8087,
  chairs: [
    { id: "chair-a", name: "椅子A", sales: 999 },
    { id: "chair-b", name: "椅子B", sales: 999 },
  ],
  models: [
    { model: "モデルA", sales: 999 },
    { model: "モデルB", sales: 999 },
  ],
} as const satisfies ProviderGetSalesResponse;

const ClientProviderContext = createContext<Partial<ClientProviderRequest>>({});

export const ProviderProvider = ({ children }: { children: ReactNode }) => {
  // TODO:
  const [searchParams] = useSearchParams();

  const id = searchParams.get("id") ?? undefined;
  const since = searchParams.get("since") ?? undefined;
  const until = searchParams.get("until") ?? undefined;

  const isDummy = useMemo(() => {
    try {
      const isDummy = sessionStorage.getItem("is-dummy-for-provider");
      return isDummy === "true";
    } catch (e) {
      console.error(`CONSOLE ERROR: ${e}`);
      return false;
    }
  }, []);

  const [sales, setSales] = useState<ProviderGetSalesResponse>();

  useEffect(() => {
    if (isDummy) {
      setSales({
        total_sales: DUMMY_DATA.total_sales,
        chairs: DUMMY_DATA.chairs,
        models: DUMMY_DATA.models,
      });
    } else {
      const abortController = new AbortController();
      (async () => {
        setSales(
          await fetchProviderGetSales(
            { queryParams: { since, until } },
            abortController.signal,
          ),
        );
      })();
      return () => {
        abortController.abort();
      };
    }
  }, [setSales, since, until, isDummy]);

  const responseClientProvider = useMemo<ClientProviderRequest>(() => {
    return {
      payload: {
        sales,
        chairs: sales?.chairs?.map((chair) => ({
          id: chair.id,
          name: chair.name,
        })),
      },
      provider: {
        id,
      },
    };
  }, [sales]);

  return (
    <ClientProviderContext.Provider value={responseClientProvider}>
      {children}
    </ClientProviderContext.Provider>
  );
};

export const useClientProviderContext = () => useContext(ClientProviderContext);
