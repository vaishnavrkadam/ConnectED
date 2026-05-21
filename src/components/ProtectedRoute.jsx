import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Box, CircularProgress, Typography } from '@mui/material';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, role, loading } = useAuth();

  // 1. While Firebase is still checking who you are, show a loading spinner
  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Verifying Access...</Typography>
      </Box>
    );
  }

  // 2. If no one is logged in at all, go to login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3. If logged in but the role hasn't loaded yet, wait a bit longer
  if (user && !role) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <CircularProgress size={20} />
        <Typography sx={{ mt: 2 }}>Setting up your profile...</Typography>
      </Box>
    );
  }

  // 4. If the role doesn't match (e.g., student trying to enter faculty page)
  if (allowedRoles && !allowedRoles.includes(role)) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h4" color="error">Access Denied</Typography>
        <Typography>You are logged in as a {role}, which doesn't have access to this page.</Typography>
        <Navigate to={role === 'student' ? '/student' : '/faculty'} replace />
      </Box>
    );
  }

  // 5. Everything is fine, show the dashboard!
  return children;
};

export default ProtectedRoute;