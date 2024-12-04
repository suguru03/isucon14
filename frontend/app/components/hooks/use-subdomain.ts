import { useEffect, useState } from "react";

export const useSubDomain = () => {
  const [subDomain, setSubDomain] = useState<string>();
  useEffect(() => {
    setSubDomain(location.hostname.split(".").shift());
  }, [setSubDomain]);
  return subDomain;
};
