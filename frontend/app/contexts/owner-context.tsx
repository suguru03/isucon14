import { useNavigate } from "@remix-run/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  OwnerGetChairsResponse,
  OwnerGetSalesResponse,
  fetchOwnerGetChairs,
  fetchOwnerGetSales,
} from "~/api/api-components";
import { OwnerChairs, OwnerSales, isClientApiError } from "~/types";
import { getCookieValue } from "~/utils/get-cookie-value";

type DateString = `${number}-${number}-${number}`; // YYYY-MM-DD

type OwnerContextProps = Partial<{
  chairs?: OwnerChairs;
  sales?: OwnerSales;
  provider?: {
    id: string;
    name: string;
  };
  until?: DateString;
  since?: DateString;
  setUntil?: (date: string) => void;
  setSince?: (date: string) => void;
}>;

const OwnerContext = createContext<OwnerContextProps>({});

const timestamp = (date: DateString) => {
  return Math.floor(new Date(date).getTime() / 1000);
};

const currentDateString: DateString = (() => {
  const offset = new Date().getTimezoneOffset() * 60000;
  const today = new Date(Date.now() - offset);
  return today.toISOString().slice(0, 10) as DateString;
})();

export const OwnerProvider = ({ children }: { children: ReactNode }) => {
  const [chairs, setChairs] = useState<OwnerGetChairsResponse["chairs"]>();
  const [sales, setSales] = useState<OwnerGetSalesResponse>();
  const navigate = useNavigate();
  const [until, _setUntil] = useState(currentDateString);
  const [since, _setSince] = useState(currentDateString);

  const setUntil = useCallback((value: string) => {
    if (/\d{4}-\d{2}-\d{2}/.test(value)) {
      _setUntil(value as DateString);
    }
  }, []);

  const setSince = useCallback((value: string) => {
    if (/\d{4}-\d{2}-\d{2}/.test(value)) {
      _setSince(value as DateString);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchOwnerGetChairs({});
        setChairs(data.chairs);
      } catch (error) {
        console.error(error);
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const sales = await fetchOwnerGetSales({
          // TODO: 機能していない？
          queryParams: {
            since: timestamp(since),
            until: timestamp(until),
          },
        });
        setSales(sales);
      } catch (error) {
        if (isClientApiError(error)) {
          if (error.stack.status === 401) {
            navigate("/owner/register");
            return;
          }
        }
        console.error(error);
      }
    })();
  }, [navigate, setChairs, setSales, since, until]);

  useEffect(() => {
    const isRegistered =
      typeof getCookieValue(document.cookie, "owner_session") !== "undefined";
    if (!isRegistered) {
      navigate("/owner/register");
    }
  }, [navigate]);

  return (
    <OwnerContext.Provider
      value={{ chairs, sales, until, since, setUntil, setSince }}
    >
      {children}
    </OwnerContext.Provider>
  );
};

export const useOwnerContext = () => useContext(OwnerContext);
