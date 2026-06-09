import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../services/http';
import { useNetworkStore } from '../stores/networkStore';

export interface UseCachedListState<T> {
  data: T[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  fromCache: boolean;
  refresh: () => Promise<void>;
}

interface Options<T> {
  fetchFromApi: () => Promise<T[]>;
  readFromCache: () => Promise<T[]>;
  writeCache: (data: T[]) => Promise<void>;
  enabled?: boolean;
}

/**
 * Hook cache-first:
 * 1. Lee SQLite inmediatamente (funciona offline).
 * 2. Si hay red, dispara fetch en background.
 * 3. Al recibir respuesta, actualiza SQLite y refleja en estado.
 */
export const useCachedList = <T>({
  fetchFromApi,
  readFromCache,
  writeCache,
  enabled = true,
}: Options<T>): UseCachedListState<T> => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const online = useNetworkStore((s) => s.online);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(
    async (isRefresh: boolean) => {
      if (!enabled) {
        setLoading(false);
        return;
      }

      // 1) Leer cache primero
      try {
        const cached = await readFromCache();
        if (mounted.current) {
          setData(cached);
          setFromCache(cached.length > 0);
        }
      } catch (e) {
        // no crítico
      }

      // 2) Si hay red, ir al API
      if (!online && !isRefresh) {
        if (mounted.current) setLoading(false);
        return;
      }

      if (isRefresh) setRefreshing(true);
      setError(null);

      try {
        const fresh = await fetchFromApi();
        await writeCache(fresh);
        if (mounted.current) {
          setData(fresh);
          setFromCache(false);
        }
      } catch (e) {
        if (mounted.current) {
          setError(e instanceof ApiError ? e.message : 'Error de red');
        }
      } finally {
        if (mounted.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [online, enabled],
  );

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(() => load(true), [load]);

  return {
    data,
    loading,
    refreshing,
    error,
    fromCache,
    refresh,
  };
};
