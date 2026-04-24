import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Fetches the user's configured Pause lock duration.
 * Defaults to 24 hours if not set.
 * Returns { lockHours, lockMs, isLoading }
 */
export function useLockHours() {
  const { data, isLoading } = useQuery({
    queryKey: ['guard-lock-hours'],
    queryFn: async () => {
      const res = await base44.entities.AppConfig.filter({ key: 'guard_lock_hours' });
      return res[0]?.value ? parseInt(res[0].value) : 24;
    },
    staleTime: 60000, // cache for 1 minute
    initialData: 24,
  });

  const lockHours = data || 24;
  return {
    lockHours,
    lockMs: lockHours * 3600 * 1000,
    isLoading,
  };
}
