import { Navigate } from 'react-router-dom';

// Redirect to dashboard since we're using Layout-based routing
const Index = () => {
  return <Navigate to="/" replace />;
};

export default Index;
