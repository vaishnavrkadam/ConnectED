// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "./theme";
import App from "./App";
import Login from "./pages/Login";
import StudentDashboard from "./pages/StudentDashboard";
import FacultyDashboard from "./pages/FacultyDashboard";

// src/main.jsx
// ... existing imports ...
import { AuthProvider } from "./context/AuthContext"; // Import the new provider
// src/main.jsx

// ... existing imports ...
import ProtectedRoute from "./components/ProtectedRoute"; // <-- NEW IMPORT

// ... (other imports) ...

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/login" element={<Login />} />
            
            {/* SECURE DASHBOARD ROUTES */}
            <Route 
              path="/student-dashboard" 
              element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} 
            />
            <Route 
              path="/faculty-dashboard" 
              element={<ProtectedRoute allowedRoles={['faculty']}><FacultyDashboard /></ProtectedRoute>} 
            />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);