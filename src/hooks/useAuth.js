/**
 * src/hooks/useAuth.js
 *
 * useAuth now reads from a shared AuthContext (see
 * src/context/AuthContext.jsx) instead of running its own separate
 * sign-in check every time a component mounts. Every existing call site
 * keeps working completely unchanged — this still returns the exact same
 * { user, profile, loading, signIn, signInWithGoogle, signOut } shape,
 * just backed by one shared check for the whole app instead of a
 * separate one per component.
 */
export { useAuth } from '../context/AuthContext'
