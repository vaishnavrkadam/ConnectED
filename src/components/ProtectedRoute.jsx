// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Box, CircularProgress } from "@mui/material";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isLoggedIn, role, loading } = useAuth();

  // 1. CRITICAL: Wait until BOTH Auth and Firestore Profile listeners drop their loading state
  if (loading) {
    return (
      <Box 
        sx={{ 
          minHeight: "100vh", 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center",
          bgcolor: "#111415" // Sourced from your Aetheric Lumina surface spec
        }}
      >
        <CircularProgress color="secondary" />
      </Box>
    );
  }

  // 2. If the loading finishes and no user session exists, send to Landing Hub
  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  // 3. If a role filter is active, verify the loaded profile role matches
  if (allowedRoles && !allowedRoles.includes(role)) {
    console.warn(`Access denied for role: ${role}. Required roles:`, allowedRoles);
    return <Navigate to="/" replace />;
  }

  // State is validated successfully; render dashboard panels safely
  return children;
};

export default ProtectedRoute;