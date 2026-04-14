import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

interface UseDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useData<T>(path: string | null): UseDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(
    (silent = false) => {
      if (!path) {
        setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      setError(null);
      api
        .get<T>(path)
        .then(setData)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    },
    [path]
  );

  useEffect(() => {
    fetch();
  }, [fetch]);

  const refetch = useCallback(() => fetch(true), [fetch]);

  return { data, loading, error, refetch };
}
