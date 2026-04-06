import { useState, useEffect, useCallback } from 'react';
import apiClient from '../lib/apiClient';

export const useUnreadCount = (pollInterval = 30000) => {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/api/v1/notifications/unread-count');
      setUnreadCount(data?.unread_count || 0);
    } catch {
      // Sessizce başarısız ol
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, pollInterval);
    return () => clearInterval(interval);
  }, [fetchCount, pollInterval]);

  return { unreadCount, refetch: fetchCount };
};
