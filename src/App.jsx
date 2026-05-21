import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Stack,
  useTheme
} from "@mui/material";

// Import assets
import collegeBg from "./assets/college-bg-entr.jpg"; // Assuming you have this path
import collegeLogo from "./assets/college-logo.png"; // Assuming you have this path

import Layout from "./components/Layout";
import QuestionAnswerIcon from "@mui/icons-material/QuestionAnswer";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh"; // Icon for Smart Assignment
import EventAvailableIcon from "@mui/icons-material/EventAvailable"; // Icon for Booking

const App = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  return (
    // We are wrapping the content in a custom background box instead of relying on Layout for the BG
    <Box
      sx={{
        minHeight: "100vh",
        // Use your custom image with a dark overlay for better text readability
        backgroundImage: `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url(${collegeBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: "white", // Set text color to white for readability on a dark background
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* --- Custom Header for Branding --- */}
      <Box sx={{ p: 3, display: "flex", alignItems: "center", gap: 1 }}>
        <img src={collegeLogo} alt="College Logo" style={{ height: 60, filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.8))' }} />
        <Typography variant="body1" fontWeight={600} color="white">
          ConnectEd : Doubt Resolution Portal
        </Typography>
      </Box>

      {/* --- Main Content --- */}
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: { xs: 2, md: 8 },
          py: 4
        }}
      >
        <Box 
          sx={{ 
            display: "flex", 
            alignItems: "center", 
            maxWidth: 1200, 
            width: '100%',
            flexDirection: { xs: 'column', md: 'row' }
          }}
        >
          {/* Left Side: Headline and CTA */}
          <Box sx={{ flex: 1, pr: { xs: 0, md: 6 }, mb: { xs: 4, md: 0 }, textAlign: { xs: 'center', md: 'left' } }}>
            <Typography 
              variant="h2" 
              fontWeight={800}
              gutterBottom 
              sx={{ 
                textShadow: '0 4px 8px rgba(0,0,0,0.8)' 
              }}
            >
              Instant Faculty Connection
            </Typography>
            <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
              The smart bridge for students to resolve academic queries and book time with the right expert.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate("/login")}
              startIcon={<QuestionAnswerIcon />}
              sx={{
                py: 1.5,
                px: 4,
                bgcolor: theme.palette.secondary.main, // Use secondary color for CTA
                '&:hover': {
                  bgcolor: theme.palette.secondary.dark,
                }
              }}
            >
              Get Started Now
            </Button>
          </Box>

          {/* Right Side: Features List */}
          <Box sx={{ flex: 1, display: 'grid', gap: 3, minWidth: 350, pt: { xs: 0, md: 4 } }}>
            {[
              { 
                icon: <AutoFixHighIcon fontSize="large" color="secondary" />,
                title: "Smart Doubt Assignment",
                desc: "Automatic routing of your question to the faculty member with the highest expertise match."
              },
              {
                icon: <EventAvailableIcon fontSize="large" color="secondary" />,
                title: "Book Personal Appointments",
                desc: "Check real-time availability and instantly secure 1-on-1 time slots with any faculty member."
              },
            ].map((feature, index) => (
              <Card 
                key={index} 
                sx={{ 
                  bgcolor: "rgba(255, 255, 255, 0.15)", // Translucent card background
                  backdropFilter: 'blur(5px)',
                  borderRadius: 3,
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white'
                }}
              >
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="center">
                    {feature.icon}
                    <Box>
                      <Typography variant="h6" fontWeight={600}>{feature.title}</Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>{feature.desc}</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default App;