import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

// Gate for protected routes: no token -> redirect to /login.
// Works both as a wrapper (<RequireAuth><Foo/></RequireAuth>) and as a
// layout route (renders <Outlet/> when no children are passed).
export default function RequireAuth({ children }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return children ?? <Outlet />
}
