// src/pages/Register.jsx
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
  CircularProgress
} from "@mui/material";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import collegeBg from "../assets/college-bg-entr.jpg";
import collegeLogo from "../assets/college-logo.png";

const Register = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState("student"); // Default whitelist tracking
  const [primaryId, setPrimaryId] = useState(""); // USN or SAP ID
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRoleChange = (event, newRole) => {
    if (newRole !== null) {
      setRole(newRole);
      setError("");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const cleanId = primaryId.trim().toUpperCase();
    const targetCollection = role === "student" ? "students" : "faculty";

    try {
      // 1. Pre-Verification Layer check
      const docRef = doc(db, targetCollection, cleanId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error(
          `Verification Failed: ${role === "student" ? "USN" : "SAP ID"} [${cleanId}] is not whitelisted by administration.`
        );
      }

      const backendData = docSnap.data();

      // 2. Structural Email verification mapping
      if (role === "student" && backendData.emails && backendData.emails.length > 0) {
        const emailAllowed = backendData.emails.some(
          (e) => e.toLowerCase() === email.trim().toLowerCase()
        );
        if (!emailAllowed) {
          throw new Error("Registration email does not match institutional records allocated to this USN.");
        }
      }

      // 3. Create Firebase User Identity safely
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      
      // ✅ FIX: Sourced directly from userCredential.user without double indexing
      const firebaseUid = userCredential.user.uid; 

      // 4. Set global routing role context
      await setDoc(doc(db, "users", firebaseUid), {
        uid: firebaseUid,
        email: email.trim().toLowerCase(),
        name: backendData.name,
        role: role,
        primaryId: cleanId,
        createdAt: serverTimestamp()
      });

      // 5. Establish dual-binding link to institutional master records
      await updateDoc(doc(db, targetCollection, cleanId), {
        uid: firebaseUid
      });

      // Secure redirection to dashboard workspace
      navigate(role === "student" ? "/student-dashboard" : "/faculty-dashboard");

    } catch (err) {
      console.error("Registration Error System:", err);
      setError(err.message || "An error occurred during account pre-verification validation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundImage: `linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.72)), url(${collegeBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        p: 2,
      }}
    >
      <Card 
        sx={{ 
          maxWidth: 450, 
          width: "100%",
          bgcolor: "rgba(25, 28, 29, 0.7)", 
          backdropFilter: "blur(20px)",
          borderRadius: 4,
          border: "1px solid rgba(255, 255, 255, 0.12)",
          color: "white",
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 }, textAlign: "center" }}>
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 1.5, mb: 2 }}>
            <img src={collegeLogo} alt="Logo" style={{ height: 45 }} />
            <Typography variant="h5" fontWeight={700}>
              Account Registration
            </Typography>
          </Box>
          
          <Typography variant="body2" sx={{ opacity: 0.7, mb: 3 }}>
            Verify your Institutional Allocation ID to link database clearances.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

          <form onSubmit={handleRegister}>
            <ToggleButtonGroup
              color="secondary"
              value={role}
              exclusive
              onChange={handleRoleChange}
              fullWidth
              sx={{ 
                mb: 3, 
                bgcolor: "rgba(255,255,255,0.05)",
                "& .MuiToggleButton-root": { color: "white", borderColor: "rgba(255,255,255,0.12)" }
              }}
            >
              <ToggleButton value="student">Student Link</ToggleButton>
              <ToggleButton value="faculty">Faculty Sync</ToggleButton>
            </ToggleButtonGroup>

            <TextField
              label={role === "student" ? "University Seat Number (USN)" : "Faculty SAP ID"}
              variant="outlined"
              fullWidth
              required
              value={primaryId}
              onChange={(e) => setPrimaryId(e.target.value)}
              placeholder={role === "student" ? "e.g., 1RV25CS001" : "e.g., 5603"}
              InputLabelProps={{ style: { color: "rgba(255,255,255,0.7)" } }}
              sx={{ mb: 2, "& .MuiOutlinedInput-root": { color: "white", "& fieldset": { borderColor: "rgba(255,255,255,0.2)" } } }}
            />

            <TextField
              label="Email Address"
              type="email"
              variant="outlined"
              fullWidth
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputLabelProps={{ style: { color: "rgba(255,255,255,0.7)" } }}
              sx={{ mb: 2, "& .MuiOutlinedInput-root": { color: "white", "& fieldset": { borderColor: "rgba(255,255,255,0.2)" } } }}
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
              sx={{ mb: 3, "& .MuiOutlinedInput-root": { color: "white", "& fieldset": { borderColor: "rgba(255,255,255,0.2)" } } }}
            />

            <Button
              type="submit"
              variant="contained"
              color="secondary"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ py: 1.5, fontWeight: 700, textTransform: "none" }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "Verify & Register"}
            </Button>
          </form>

          <Button 
            variant="text" 
            onClick={() => navigate("/login")} 
            sx={{ mt: 2, color: "rgba(255,255,255,0.6)", textTransform: "none" }}
          >
            Already verified? Return to Sign In
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Register;