import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

/**
 * AuthGuard — wraps /admin/* routes.
 *
 * - While the initial session/profile check is in flight: render nothing (avoid flash).
 * - No authenticated user: redirect to /admin/login.
 * - Authenticated but not an admin: redirect to / (D17). Now that regular
 *   users can also hold a session (D9: one Supabase Auth system, role
 *   flag distinguishes admin/end users), "signed in" alone is no longer
 *   enough to pass this guard — a signed-in non-admin isn't logged out,
 *   they're just not authorized here, so sending them to a "please sign
 *   in" screen would be factually wrong. Returning them to the normal
 *   app is the correct response.
 * - Authenticated admin: render children.
 */
export default function AuthGuard({ children }) {
  const { user, profile, loading } = useAuth()

  if (loading) return null

  if (!user) return <Navigate to="/admin/login" replace />

  if (profile?.role !== 'admin') return <Navigate to="/" replace />

  return children
}
