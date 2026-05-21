import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Button,
  Typography,
  Stack,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from "@mui/material";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import GoogleIcon from '@mui/icons-material/Google';

// Assets
import bgImage from "../assets/college-bg.jpg";
import logo from "../assets/college-logo.png";

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Dialog States
  const [openRoleDialog, setOpenRoleDialog] = useState(false);
  const [tempUser, setTempUser] = useState(null);
  const [role, setRole] = useState("");
  const [idValue, setIdValue] = useState(""); // USN or Faculty ID

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if profile exists in Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists()) {
        // Returning User
        const userData = userDoc.data();
        navigate(userData.role === "student" ? "/student" : "/faculty");
      } else {
        // New User - Open Dialog
        setTempUser(user);
        setOpenRoleDialog(true);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to sign in with Google. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinishSignup = async () => {
    if (!idValue) {
      setError("Please enter your USN.");
      return;
    }

    try {
      const newUserProfile = {
        name: tempUser.displayName,
        email: tempUser.email,
        role: "student", // FORCED: Default role is now always student
        uid: tempUser.uid,
        department: "General", 
        expertise: [], 
        createdAt: new Date().toISOString(),
        usn: idValue // Map ID to USN
      };

      await setDoc(doc(db, "users", tempUser.uid), newUserProfile);
      setOpenRoleDialog(false);
      navigate("/student"); // Always send to student dashboard
    } catch (err) {
      setError("Failed to create profile. Contact admin.");
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "left",
        px: 2
      }}
    >
      <Card sx={{ maxWidth: 400, width: "100%", borderRadius: 4, textAlign: "center", p: 2 }}>
        <CardContent>
          <img src={logo} alt="Logo" style={{ height: 80, marginBottom: 16 }} />
          <Typography variant="h5" fontWeight={700} gutterBottom>
            ConnectEd Portal
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={4}>
            Please sign in with your college Google account to continue.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Button
            fullWidth
            variant="contained"
            size="large"
            startIcon={<GoogleIcon />}
            onClick={handleGoogleLogin}
            disabled={loading}
            sx={{ py: 1.5, textTransform: "none", fontSize: "1rem" }}
          >
            {loading ? "Connecting..." : "Sign in with Google"}
          </Button>
        </CardContent>
      </Card>

      {/* --- ROLE SELECTION DIALOG --- */}
      <Dialog open={openRoleDialog} disableEscapeKeyDown>
        <DialogTitle>Complete Your Student Profile</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 3 }}>
            Welcome <strong>{tempUser?.displayName}</strong>! Please enter your details to access the portal.
          </Typography>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Role selection is removed - Role is Student by default */}
            <TextField
              fullWidth
              label="USN (University Serial No)"
              placeholder="e.g. 1RV22CS001"
              value={idValue}
              onChange={(e) => setIdValue(e.target.value)}
              autoFocus
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={handleFinishSignup} 
            variant="contained" 
            disabled={!idValue}
          >
            Join ConnectEd
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Login;