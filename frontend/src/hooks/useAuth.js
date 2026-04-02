import { useAuth as useAuthContext } from '@/context/AuthContext';

/**
 * Re-export the auth hook for convenience.
 */
export default function useAuth() {
  return useAuthContext();
}
