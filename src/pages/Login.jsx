// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  CircularProgress,
  useTheme
} from "@mui/material";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

// Import institutional assets exactly matching your asset pipeline
import collegeBg from "../assets/college-bg.jpg"; 
import collegeLogo from "../assets/college-logo.png";

const Login = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  // Mode Selection: "login" or "register"
  const [authMode, setAuthMode] = useState("login");
  
  // Account Category Configuration: "student" or "faculty"
  const [role, setRole] = useState("student");
  
  // Form Field Tracking Elements
  const [primaryId, setPrimaryId] = useState(""); // Holds USN or SAP ID during registration
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Operational UI States
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleModeChange = (mode) => {
    setAuthMode(mode);
    setError("");
    setPrimaryId("");
    setEmail("");
    setPassword("");
  };

  const handleRoleChange = (event, newRole) => {
    if (newRole !== null) {
      setRole(newRole);
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(false);
    setLoading(true);

    if (authMode === "login") {
      // ---- CORE LOGIN PROCESSING WORKFLOW ----
      try {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        
        // Fetch the registered profile document to map routing safely
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          navigate(userData.role === "student" ? "/student-dashboard" : "/faculty-dashboard");
        } else {
          throw new Error("Base configuration profile missing. Please re-register your identity.");
        }
      } catch (err) {
        console.error("Login Error Structure:", err);
        setError(err.message || "Invalid email or matching security password credentials.");
      } finally {
        setLoading(false);
      }
    } else {
      // ---- CORE WHITELIST REGISTRATION WORKFLOW ----
      const cleanId = primaryId.trim().toUpperCase();
      const targetCollection = role === "student" ? "students" : "faculty";

      try {
        // 1. Pre-Verification Check against seeded administrative collections
        const docRef = doc(db, targetCollection, cleanId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          throw new Error(
            `Verification Blocked: ${role === "student" ? "USN" : "SAP ID"} [${cleanId}] is not whitelisted inside database registers.`
          );
        }

        const backendData = docSnap.data();

        // 2. Validate email permissions if registering as a student
        if (role === "student" && backendData.emails && backendData.emails.length > 0) {
          const emailAllowed = backendData.emails.some(
            (e) => e.toLowerCase() === email.trim().toLowerCase()
          );
          if (!emailAllowed) {
            throw new Error("Target registration email does not match institutional records for this USN.");
          }
        }

        // 3. Native Firebase Authentication invocation
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        
        // ✅ Fixed: Safe singular property resolution extraction
        const firebaseUid = userCredential.user.uid;

        // 4. Populate root identity profile database mapping
        await setDoc(doc(db, "users", firebaseUid), {
          uid: firebaseUid,
          email: email.trim().toLowerCase(),
          name: backendData.name,
          role: role,
          primaryId: cleanId,
          createdAt: serverTimestamp()
        });

        // 5. Explicitly dual-bind structural master tables to auth UID
        await updateDoc(doc(db, targetCollection, cleanId), {
          uid: firebaseUid
        });

        // Direct workspace routing allocation switch
        navigate(role === "student" ? "/student-dashboard" : "/faculty-dashboard");

      } catch (err) {
        console.error("Verification System Failure:", err);
        setError(err.message || "An unhandled execution validation error has halted registration.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        // Translucent glow overlay structure matching layout assets
        backgroundImage: `linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.72)), url(${collegeBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "left",
        p: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: 460,
          width: "100%",
          // Glassmorphic styling variables
          bgcolor: "rgba(25, 28, 29, 0.65)",
          backdropFilter: "blur(25px)",
          borderRadius: 4,
          border: "1px solid rgba(255, 255, 255, 0.15)",
          color: "white",
          boxShadow: "0 16px 40px rgba(0,0,0,0.6)"
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 }, textAlign: "center" }}>
          
          {/* Institutional Header Component Setup */}
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 1.5, mb: 1 }}>
            <img 
              src={collegeLogo} 
              alt="College Logo" 
              style={{ height: 45, filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.6))' }} 
            />
            <Typography variant="h5" fontWeight={700} color="white">
              ConnectEd Portal
            </Typography>
          </Box>

          <Typography variant="body2" sx={{ opacity: 0.7, mb: 3 }}>
            {authMode === "login" 
              ? "Sign in using your institutional valid credentials." 
              : "Verify administrative clearance allocation keys."}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2, textAlign: "left" }}>
              {error}
            </Alert>
          )}
  
          <form onSubmit={handleSubmit}>
            {/* View Switching Selection Tab Block */}
            {authMode === "register" && (
              <ToggleButtonGroup
                color="secondary"
                value={role}
                exclusive
                onChange={handleRoleChange}
                fullWidth
                sx={{
                  mb: 2.5,
                  bgcolor: "rgba(255,255,255,0.04)",
                  "& .MuiToggleButton-root": { 
                    color: "white", 
                    borderColor: "rgba(255,255,255,0.12)",
                    textTransform: "none",
                    fontWeight: 600
                  }
                }}
              >
                <ToggleButton value="student">Student Track</ToggleButton>
                <ToggleButton value="faculty">Faculty Sync</ToggleButton>
              </ToggleButtonGroup>
            )}

            {/* Render unique Identity Input only inside Registration parameters */}
            {authMode === "register" && (
              <TextField
                label={role === "student" ? "University Seat Number (USN)" : "Faculty SAP ID"}
                variant="outlined"
                fullWidth
                required
                value={primaryId}
                onChange={(e) => setPrimaryId(e.target.value)}
                placeholder={role === "student" ? "e.g., 1RV25CS001" : "e.g., 5603"}
                InputLabelProps={{ style: { color: "rgba(255,255,255,0.7)" } }}
                sx={{
                  mb: 2,
                  "& .MuiOutlinedInput-root": {
                    color: "white",
                    "& fieldset": { borderColor: "rgba(255,255,255,0.15)" },
                    "&:hover fieldset": { borderColor: "rgba(255,255,255,0.35)" }
                  }
                }}
              />
            )}

            <TextField
              label="Account Email"
              type="email"
              variant="outlined"
              fullWidth
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputLabelProps={{ style: { color: "rgba(255,255,255,0.7)" } }}
              sx={{
                mb: 2,
                "& .MuiOutlinedInput-root": {
                  color: "white",
                  "& fieldset": { borderColor: "rgba(255,255,255,0.15)" },
                  "&:hover fieldset": { borderColor: "rgba(255,255,255,0.35)" }
                }
              }}
            />

            <TextField
              label="Password"
              type="password"
              variant="outlined"
              fullWidth
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputLabelProps={{ style: { color: "rgba(255,255,255,0.7)" } }}
              sx={{
                mb: 3,
                "& .MuiOutlinedInput-root": {
                  color: "white",
                  "& fieldset": { borderColor: "rgba(255,255,255,0.15)" },
                  "&:hover fieldset": { borderColor: "rgba(255,255,255,0.35)" }
                }
              }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{
                py: 1.5,
                borderRadius: 2,
                fontWeight: 700,
                textTransform: "none",
                bgcolor: theme.palette.secondary.main, // Sourced from global theme context variables
                "&:hover": {
                  bgcolor: theme.palette.secondary.dark,
                }
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : authMode === "login" ? (
                "Sign In to Workspace"
              ) : (
                "Verify & Complete Setup"
              )}
            </Button>
          </form>

          {/* Toggle Controls to flip between structures seamlessly */}
          <Box sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 1, alignItems: "center" }}>
            {authMode === "login" ? (
              <Button
                variant="text"
                onClick={() => handleModeChange("register")}
                sx={{ color: theme.palette.secondary.main, textTransform: "none", fontWeight: 600 }}
              >
                First time here? Register USN / SAP ID
              </Button>
            ) : (
              <Button
                variant="text"
                onClick={() => handleModeChange("login")}
                sx={{ color: theme.palette.secondary.main, textTransform: "none", fontWeight: 600 }}
              >
                Existing Account? Return to Login Workspace
              </Button>
            )}

            <Button
              variant="text"
              onClick={() => navigate("/")}
              sx={{ color: "rgba(255,255,255,0.45)", textTransform: "none", fontSize: "0.82rem" }}
            >
              Return to Landing Hub
            </Button>
          </Box>

        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;