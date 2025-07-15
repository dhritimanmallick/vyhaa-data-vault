import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function UserRedirect() {
  const { isAdmin } = useAuth();

  // If admin, show dashboard; if user, redirect to documents
  if (isAdmin) {
    return <Navigate to="/dashboard" replace />;
  } else {
    return <Navigate to="/view-documents" replace />;
  }
}