import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/http';

export interface UseFetchState<T> {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  reload: () => Promise<void>;
}

export const useFetch = <T>(
  fetcher: () => Promise<T>,
  deps: any[] = [],
): UseFetchState<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh: boolean) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const result = await fetcher();
        setData(result);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Error al cargar datos');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return {
    data,
    loading,
    refreshing,
    error,
    refresh: () => load(true),
    reload: () => load(false),
  };
};
