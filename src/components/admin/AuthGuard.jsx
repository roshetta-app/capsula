import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

/**
 * AuthGuard — wraps /admin/* routes.
 *
 * - While the initial session check is in flight: render nothing (avoid flash).
 * - No authenticated user: redirect to /admin/login.
 * - Authenticated: render children.
 */
export default function AuthGuard({ children }) {
  const { user, loading } = useAuth()

  if (loading) return null

  if (!user) return <Navigate to="/admin/login" replace />

  return children
}
