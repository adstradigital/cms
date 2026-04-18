import { useState, useEffect, useCallback } from 'react';
import instance from '@/api/instance';

/**
 * Generic data-fetching hook.
 * @param {string} url - API endpoint to fetch
 * @param {object} options - { immediate: boolean }
 */
export default function useFetch(url, { immediate = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await instance.get(url);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (immediate && url) {
      fetchData();
    }
  }, [immediate, url, fetchData]);

  return { data, loading, error, refetch: fetchData };
}
