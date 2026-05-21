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
  const [role, setRole] = useState("student"); // "student" | "faculty"
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
      // 1. Pre-Verification Step: Check if institutional natural key profile exists
      const docRef = doc(db, targetCollection, cleanId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error(
          `Verification Failed: ${role === "student" ? "USN" : "SAP ID"} [${cleanId}] is not whitelisted by administration.`
        );
      }

      const backendData = docSnap.data();

      // For students, ensure the registering email is allowed in their pre-loaded array
      if (role === "student" && backendData.emails && backendData.emails.length > 0) {
        const emailAllowed = backendData.emails.some(
          (e) => e.toLowerCase() === email.trim().toLowerCase()
        );
        if (!emailAllowed) {
          throw new Error("Registration email does not match institutional records allocated to this USN.");
        }
      }

      // 2. Perform Native Firebase Authentication creation
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const firebaseUid = userCredential.user.user.uid;

      // 3. Create the Base Role & Identity Core Document Mapping
      await setDoc(doc(db, "users", firebaseUid), {
        uid: firebaseUid,
        email: email.trim().toLowerCase(),
        name: backendData.name,
        role: role,
        primaryId: cleanId,
        createdAt: serverTimestamp()
      });

      // 4. Update the Pre-Existing Natural Key Collection to link back to Auth UID
      await updateDoc(doc(db, targetCollection, cleanId), {
        uid: firebaseUid
      });

      // Navigate to respective dashboard dashboard dynamically based on structural role
      navigate(role === "student" ? "/student-dashboard" : "/faculty-dashboard");

    } catch (err) {
      console.error("Registration Error Structure:", err);
      setError(err.message || "An unhandled error occurred during pre-verification setup.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url(${collegeBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        p: 2,
      }}
    >
      <Card 
        sx={{ 
          maxWidth: 450, 
          width: "100%",
          bgcolor: "rgba(25, 28, 29, 0.65)", // Surface container tint
          backdropFilter: "blur(20px)",
          borderRadius: 4,
          border: "1px solid rgba(255, 255, 255, 0.12)",
          color: "white",
          boxShadow: "0 12px 40px rgba(0,0,0,0.5)"
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 }, textAlign: "center" }}>
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 1.5, mb: 2 }}>
            <img src={collegeLogo} alt="Logo" style={{ height: 45 }} />
            <Typography variant="h5" fontWeight={700} color="white">
              ConnectEd Portal
            </Typography>
          </Box>
          
          <Typography variant="body2" sx={{ opacity: 0.7, mb: 3 }}>
            Verify your Institutional Allocation Identity to gain workspace clearance.
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
                borderRadius: 2,
                "& .MuiToggleButton-root": { color: "white", borderColor: "rgba(255,255,255,0.12)" }
              }}
            >
              <ToggleButton value="student" fontWeight={600}>Student Registration</ToggleButton>
              <ToggleButton value="faculty" fontWeight={600}>Faculty Sync</ToggleButton>
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
              sx={{ 
                mb: 2,
                "& .MuiOutlinedInput-root": {
                  color: "white",
                  "& fieldset": { borderColor: "rgba(255,255,255,0.2)" },
                  "&:hover fieldset": { borderColor: "rgba(255,255,255,0.4)" },
                }
              }}
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
              sx={{ 
                mb: 2,
                "& .MuiOutlinedInput-root": {
                  color: "white",
                  "& fieldset": { borderColor: "rgba(255,255,255,0.2)" },
                  "&:hover fieldset": { borderColor: "rgba(255,255,255,0.4)" },
                }
              }}
            />

            <TextField
              label="Account Password"
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
                  "& fieldset": { borderColor: "rgba(255,255,255,0.2)" },
                  "&:hover fieldset": { borderColor: "rgba(255,255,255,0.4)" },
                }
              }}
            />

            <Button
              type="submit"
              variant="contained"
              color="secondary"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ py: 1.5, borderRadius: 2, fontWeight: 700 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "Verify & Complete Setup"}
            </Button>
          </form>

          <Button 
            variant="text" 
            onClick={() => navigate("/login")} 
            sx={{ mt: 2, color: "rgba(255,255,255,0.6)", textTransform: "none" }}
          >
            Already verified? Return to Login Workspace
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Register;