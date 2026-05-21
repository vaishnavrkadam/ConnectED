import React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Button,
  Chip
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; 
import LogoutIcon from '@mui/icons-material/Logout'; // Ensure icons are installed
import collegeLogo from "../assets/college-logo.png"; 

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const { profile, isLoggedIn, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  // Logic to show Name and Role
  const userName = profile?.name || "User";
  const userRole = profile?.role || "";

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar
        position="sticky" // Changed to sticky so it stays visible while scrolling
        elevation={1}
        sx={{
          bgcolor: "background.paper",
          borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
          zIndex: (theme) => theme.zIndex.drawer + 1
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between" }}>
          {/* LEFT: Branding */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <img src={collegeLogo} alt="College Logo" style={{ height: 35 }} /> 
            <Typography variant="subtitle1" fontWeight={700} color="primary.main">
              ConnectEd Portal
            </Typography>
          </Box>

          {/* RIGHT: User Info & Single Logout Button */}
          {isLoggedIn && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="body2" fontWeight={600} color="text.primary">
                  {userName}
                </Typography>
                {userRole && (
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                    {userRole}
                  </Typography>
                )}
              </Box>

              <Button
                variant="contained"
                color="error"
                size="small"
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
                sx={{ 
                  borderRadius: 2,
                  textTransform: 'none',
                  px: 2
                }}
              >
                Logout
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {children}
      </Container>
    </Box>
  );
};

export default Layout;