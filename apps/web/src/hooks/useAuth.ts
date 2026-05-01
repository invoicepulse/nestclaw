import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

export function useAuth(requireAuth = true) {
  const { user, session, loading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && requireAuth && !user) navigate('/login');
  }, [loading, requireAuth, user, navigate]);

  return { user, session, loading };
}
