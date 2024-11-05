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
  OwnerGetSalesResponse,
  fetchOwnerGetSales,
} from "~/apiClient/apiComponents";

type ProviderChair = { id: string; name: string };

type ClientProviderRequest = Partial<{
  chairs: ProviderChair[];
  sales: OwnerGetSalesResponse;
  provider: {
    id?: string;
  };
}>;

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
} as const satisfies OwnerGetSalesResponse;

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
      if (typeof e === "string") {
        console.error(`CONSOLE ERROR: ${e}`);
      }
      return false;
    }
  }, []);

  const [sales, setSales] = useState<OwnerGetSalesResponse>();

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
          await fetchOwnerGetSales(
            { queryParams: { since: Number(since), until: Number(until) } },
            abortController.signal,
          ),
        );
      })().catch((reason) => {
        if (typeof reason === "string") {
          console.error(`CONSOLE PROMISE ERROR: ${reason}`);
        }
      });
      return () => {
        abortController.abort();
      };
    }
  }, [setSales, since, until, isDummy]);

  const responseClientProvider = useMemo<ClientProviderRequest>(() => {
    return {
      sales,
      chairs: sales?.chairs?.map((chair) => ({
        id: chair.id,
        name: chair.name,
      })),
      provider: {
        id,
      },
    } satisfies ClientProviderRequest;
  }, [sales, id]);

  return (
    <ClientProviderContext.Provider value={responseClientProvider}>
      {children}
    </ClientProviderContext.Provider>
  );
};

export const useClientProviderContext = () => useContext(ClientProviderContext);
