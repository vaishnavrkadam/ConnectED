// src/pages/StudentDashboard.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Stack,
  TextField,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme
  
} from "@mui/material";
import { collection, query, where, onSnapshot, orderBy, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

// Sidebar & General Icons
import DashboardIcon from "@mui/icons-material/Dashboard";
import QuestionAnswerIcon from "@mui/icons-material/QuestionAnswer";
import GroupsIcon from "@mui/icons-material/Groups";
import AssignmentIcon from "@mui/icons-material/Assignment";
import EventIcon from "@mui/icons-material/Event";
import LogoutIcon from "@mui/icons-material/Logout";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import SearchIcon from "@mui/icons-material/Search";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import HubIcon from "@mui/icons-material/Hub";
import DoubtResolutionDialog from "../components/DoubtResolutionDialog";

import collegeBg from "../assets/college-bg-entr.jpg";

const StudentDashboard = () => {
  const { profile, extendedProfile, signOut } = useAuth();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState("overview");

  // Sidebar Expertise Explorer State Elements
  const [globalExpertiseList, setGlobalExpertiseList] = useState([]);
  const [selectedExpertise, setSelectedExpertise] = useState(null);
  const [facultyModalOpen, setFacultyModalOpen] = useState(false);
  const [matchingFaculty, setMatchingFaculty] = useState([]);

  const studentData = extendedProfile || {
    name: profile?.name || "Verified Student",
    branch: "Loading...",
    semester: "-",
    section: "-",
    activityPointsSummary: { approvedPoints: 0, pendingPoints: 0 }
  };

  const usnIdentifier = profile?.primaryId || "USN Unassigned";

  // Aggregate a live unique deduplicated array of all faculty expertise fields
  useEffect(() => {
    const facultyRef = collection(db, "faculty");
    const unsubscribe = onSnapshot(facultyRef, (snapshot) => {
      const expertiseSet = new Set();
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.expertise && Array.isArray(data.expertise)) {
          data.expertise.forEach((exp) => {
            if (exp) expertiseSet.add(exp.trim().toLowerCase());
          });
        }
      });
      setGlobalExpertiseList(Array.from(expertiseSet).sort());
    });
    return () => unsubscribe();
  }, []);

  const handleExpertiseClick = async (skill) => {
    setSelectedExpertise(skill);
    setFacultyModalOpen(true);
    
    try {
      const facultyRef = collection(db, "faculty");
      const snapshot = await getDocs(facultyRef);
      const experts = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.expertise && Array.isArray(data.expertise)) {
          const hasSkill = data.expertise.some(
            (e) => e.trim().toLowerCase() === skill.toLowerCase()
          );
          if (hasSkill) {
            experts.push({ id: doc.id, ...data });
          }
        }
      });
      setMatchingFaculty(experts);
    } catch (err) {
      console.error("Error matching faculty expertise:", err);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundImage: `linear-gradient(rgba(12, 14, 16, 0.92), rgba(12, 14, 16, 0.97)), url(${collegeBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        color: "#e2e2e4",
        display: "flex",
        flexDirection: { xs: "column", md: "row" }
      }}
    >
      {/* --- SIDEBAR PANEL NAVIGATION --- */}
      <Box
        sx={{
          width: { xs: "100%", md: 280 },
          bgcolor: "rgba(25, 28, 29, 0.85)",
          backdropFilter: "blur(20px)",
          borderRight: { xs: "none", md: "1px solid rgba(255, 255, 255, 0.08)" },
          borderBottom: { xs: "1px solid rgba(255, 255, 255, 0.08)", md: "none" },
          display: "flex",
          flexDirection: "column",
          p: 3,
          maxHeight: { md: "100vh" },
          overflowY: "auto"
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3, mt: 1 }}>
          <Avatar
            sx={{
              bgcolor: theme.palette.secondary.main,
              color: "#64003a",
              fontWeight: 700,
              width: 44,
              height: 44,
              boxShadow: "0 0 12px rgba(255, 176, 206, 0.4)"
            }}
          >
            {studentData.name.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ maxWidth: 170 }}>
              {studentData.name}
            </Typography>
            <Typography variant="caption" sx={{ color: "#c6c5d7", opacity: 0.8 }}>
              {usnIdentifier}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ borderColor: "rgba(255,255,255,0.08)", mb: 2 }} />

        <List sx={{ p: 0 }}>
          {[
            { id: "overview", text: "Dashboard Overview", icon: <DashboardIcon /> },
            { id: "doubts", text: "Doubt Resolution", icon: <QuestionAnswerIcon /> },
            { id: "clubs", text: "Club Operations", icon: <GroupsIcon /> },
            { id: "mentorship", text: "Project Teams", icon: <AssignmentIcon /> },
            { id: "appointments", text: "Counseling Slots", icon: <EventIcon /> }
          ].map((item) => (
            <ListItem
              button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                bgcolor: activeTab === item.id ? "rgba(192, 193, 255, 0.12)" : "transparent",
                color: activeTab === item.id ? "#c0c1ff" : "#e2e2e4",
                "&:hover": { bgcolor: "rgba(255, 255, 255, 0.05)" },
                cursor: "pointer"
              }}
            >
              <ListItemIcon sx={{ color: activeTab === item.id ? "#c0c1ff" : "inherit", minWidth: 36 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: "0.9rem", fontWeight: 600 }} />
            </ListItem>
          ))}
        </List>

        {/* --- EXPERTISE EXPLORER IN THE SIDEBAR --- */}
        <Box sx={{ mt: 2, mb: 2, flexGrow: 1 }}>
          <Typography variant="caption" fontWeight={700} sx={{ color: "#c0c1ff", letterSpacing: "1px", display: "block", mb: 1, px: 1 }}>
            EXPERTISE EXPLORER
          </Typography>
          <Box 
            sx={{ 
              maxHeight: 180, 
              overflowY: "auto", 
              bgcolor: "rgba(0,0,0,0.2)", 
              borderRadius: 2, 
              p: 1,
              border: "1px solid rgba(255,255,255,0.04)"
            }}
          >
            {globalExpertiseList.length === 0 ? (
              <Typography variant="caption" sx={{ p: 1, display: "block", opacity: 0.5 }}>Loading skills...</Typography>
            ) : (
              globalExpertiseList.map((skill) => (
                <Box
                  key={skill}
                  onClick={() => handleExpertiseClick(skill)}
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "#c6c5d7",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    "&:hover": { bgcolor: "rgba(255, 255, 255, 0.05)", color: "#ffb0ce" }
                  }}
                >
                  <HubIcon sx={{ fontSize: 14, color: "rgba(192, 193, 255, 0.5)" }} />
                  <span style={{ textTransform: "capitalize" }}>{skill}</span>
                </Box>
              ))
            )}
          </Box>
        </Box>

        <Divider sx={{ borderColor: "rgba(255,255,255,0.08)", mb: 2 }} />

        <Button
          variant="text"
          startIcon={<LogoutIcon />}
          onClick={signOut}
          sx={{
            color: "#ffb0ce",
            justifyContent: "flex-start",
            textTransform: "none",
            fontWeight: 600,
            pt: 1,
            pb: 1
          }}
        >
          Sign Out Workspace
        </Button>
      </Box>

      {/* --- MAIN WORKSPACE WINDOW --- */}
      <Box sx={{ flexGrow: 1, p: { xs: 2, sm: 4, md: 5 }, overflowY: "auto", maxHeight: "100vh" }}>
        
        {/* VIEW 1: MASTER GENERAL OVERVIEW DASHBOARD */}
        {activeTab === "overview" && (
          <Box>
            <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
              <Box>
                <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: "-0.5px" }}>
                  Student Workspace
                </Typography>
                <Typography variant="body2" sx={{ color: "#c6c5d7", opacity: 0.85, mt: 0.5 }}>
                  Academic Pipeline Monitoring Matrix
                </Typography>
              </Box>
              <Chip
                label={`Semester ${studentData.semester} — Sec ${studentData.section}`}
                sx={{
                  bgcolor: "rgba(192, 193, 255, 0.15)",
                  color: "#c0c1ff",
                  fontWeight: 700,
                  border: "1px solid rgba(192, 193, 255, 0.25)",
                  borderRadius: "8px"
                }}
              />
            </Box>

            <Grid container spacing={3.5}>
              <Grid item xs={12} lg={4}>
                <Card sx={{ bgcolor: "rgba(30, 32, 33, 0.5)", backdropFilter: "blur(20px)", borderRadius: 4, border: "1px solid rgba(255, 255, 255, 0.1)", color: "white" }}>
                  <CardContent sx={{ p: 4 }}>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 3, color: "#c0c1ff" }}>Academic Credentials</Typography>
                    <Stack spacing={2.5}>
                      <Box>
                        <Typography variant="caption" sx={{ color: "#c6c5d7", display: "block", mb: 0.5 }}>DEPARTMENT BRANCH</Typography>
                        <Typography variant="body1" fontWeight={600}>{studentData.branch}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: "#c6c5d7", display: "block", mb: 0.5 }}>UNIVERSITY SEAT NUMBER (USN)</Typography>
                        <Typography variant="body1" fontWeight={600} sx={{ fontFamily: "monospace" }}>{usnIdentifier}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: "#c6c5d7", display: "block", mb: 0.5 }}>CONNECTED TELEPHONY</Typography>
                        <Typography variant="body1" fontWeight={600}>{studentData.phoneNumber || "None Linked"}</Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6} lg={4}>
                <Card sx={{ bgcolor: "rgba(30, 32, 33, 0.5)", backdropFilter: "blur(20px)", borderRadius: 4, border: "1px solid rgba(255, 255, 255, 0.1)", color: "white", height: "100%" }}>
                  <CardContent sx={{ p: 4, display: "flex", flexDirection: "column", height: "100%" }}>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 3, color: "#ffb0ce" }}>AICTE Activity Points</Typography>
                    <Stack spacing={3} sx={{ flexGrow: 1, justifyContent: "center" }}>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <CheckCircleOutlineIcon sx={{ color: "#4caf50" }} />
                          <Typography variant="body1" fontWeight={600}>Approved Points</Typography>
                        </Stack>
                        <Typography variant="h5" fontWeight={800} sx={{ ml: "auto", color: "#4caf50" }}>{studentData.activityPointsSummary?.approvedPoints || 0}</Typography>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <HourglassEmptyIcon sx={{ color: "#ffb74d" }} />
                          <Typography variant="body1" fontWeight={600}>Pending Verification</Typography>
                        </Stack>
                        <Typography variant="h5" fontWeight={800} sx={{ ml: "auto", color: "#ffb74d" }}>{studentData.activityPointsSummary?.pendingPoints || 0}</Typography>
                      </Box>
                    </Stack>
                    <Divider sx={{ borderColor: "rgba(255,255,255,0.08)", my: 2 }} />
                    <Typography variant="caption" sx={{ color: "#c6c5d7", opacity: 0.6, textAlign: "center" }}>Requires 100 overall points for graduation clearance.</Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6} lg={4}>
                <Card sx={{ bgcolor: "rgba(30, 32, 33, 0.5)", backdropFilter: "blur(20px)", borderRadius: 4, border: "1px solid rgba(255, 255, 255, 0.1)", color: "white" }}>
                  <CardContent sx={{ p: 4 }}>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: "#e2e2e4" }}>Quick Action Portal</Typography>
                    <List disablePadding>
                      {[
                        { text: "Log An Academic Doubt", action: () => setActiveTab("doubts") },
                        { text: "Check Club Action Requests", action: () => setActiveTab("clubs") },
                        { text: "Review Mentor Appointments", action: () => setActiveTab("appointments") }
                      ].map((actionItem, idx) => (
                        <Box key={idx}>
                          <ListItem secondaryAction={<IconButton edge="end" sx={{ color: "#c0c1ff" }}><ArrowForwardIosIcon sx={{ fontSize: 14 }} /></IconButton>} disablePadding sx={{ py: 1.5, cursor: "pointer" }} onClick={actionItem.action}>
                            <ListItemText primary={actionItem.text} primaryTypographyProps={{ fontSize: "0.92rem", fontWeight: 600 }} />
                          </ListItem>
                          {idx < 2 && <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />}
                        </Box>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* VIEW 2: FULL WIDTH DOUBT WORKSPACE ROUTE TARGET */}
        {activeTab === "doubts" && (
          <DoubtResolutionPortal 
            studentUsn={usnIdentifier}
            studentName={studentData.name}
            counsellorSapId={studentData.counsellorSapId}
            onBack={() => setActiveTab("overview")}
          />
        )}

        {/* OTHER FALLBACK TARGET MODULES */}
        {activeTab !== "overview" && activeTab !== "doubts" && (
          <Box>
            <Button startIcon={<ArrowBackIcon />} onClick={() => setActiveTab("overview")} sx={{ color: "#c0c1ff", mb: 3, textTransform: "none" }}>Back to Overview</Button>
            <Card sx={{ bgcolor: "rgba(25, 28, 29, 0.5)", backdropFilter: "blur(25px)", borderRadius: 4, border: "1px solid rgba(255, 255, 255, 0.1)", p: 4, textAlign: "center" }}>
              <Typography variant="h6" fontWeight={700}>{activeTab.toUpperCase()} Module Workspace</Typography>
              <Typography variant="body2" sx={{ color: "#c6c5d7", opacity: 0.7, mt: 1 }}>Component system initializing.</Typography>
            </Card>
          </Box>
        )}
      </Box>

      {/* SIDEBAR EXPLORER LIST POP-UP DIALOG MODAL MAP */}
      <Dialog 
        open={facultyModalOpen} 
        onClose={() => setFacultyModalOpen(false)}
        PaperProps={{
          sx: { bgcolor: "#1a1c1d", color: "white", borderRadius: 3, border: "1px solid rgba(255,255,255,0.1)", width: "100%", maxWidth: 450 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.08)", textTransform: "capitalize" }}>
          Experts in: {selectedExpertise}
        </DialogTitle>
        <DialogContent sx={{ mt: 2, p: 3 }}>
          {matchingFaculty.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 2 }}>
              <CircularProgress size={24} color="secondary" />
              <Typography variant="body2" sx={{ color: "#c6c5d7", mt: 1 }}>Scanning faculty manifests...</Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {matchingFaculty.map((fac) => (
                <Box key={fac.id} sx={{ p: 2, borderRadius: 2, bgcolor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <Typography variant="body1" fontWeight={700} color="#c0c1ff">{fac.name}</Typography>
                  <Typography variant="body2" sx={{ color: "#c6c5d7", fontFamily: "monospace", mt: 0.5 }}>SAP ID: {fac.id}</Typography>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", display: "block", mt: 0.5 }}>Dept: {fac.department}</Typography>
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

// ---- EXPANDED DOUBT WORKSPACE CONSOLE & REPLICA LEDGER QUEUE ----
const DoubtResolutionPortal = ({ studentUsn, studentName, counsellorSapId, onBack }) => {
  const [singleDoubtInput, setSingleDoubtInput] = useState("");
  const [historicalDoubts, setHistoricalDoubts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState({ type: "", msg: "" });
  const [openChat, setOpenChat] = useState(false);
  const [selectedDoubt, setSelectedDoubt] = useState(null);

  // Intelligent Assignment Dialog States Sourced from FacultyAssignmentDialog Blueprint
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [matchedFacultyPool, setMatchedFacultyPool] = useState([]);
  const [analyzingPool, setAnalyzingPool] = useState(false);
  const [selectedFacultyId, setSelectedFacultyId] = useState(null);

  // REALTIME REAL-TIME ACTION LISTENER SYNC ENGINE
  useEffect(() => {
    if (!studentUsn) return;

    const doubtsRef = collection(db, "doubts");
    
    // FIX: Removed server-side orderBy to bypass the manual Firestore composite index requirement
    const q = query(
      doubtsRef,
      where("studentUsn", "==", studentUsn)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const issues = [];
      snapshot.forEach((doc) => {
        issues.push({ id: doc.id, ...doc.data() });
      });

      // Sort in-memory safely to correctly process both Firestore server timestamps and local cache values
      issues.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
        return timeB - timeA; // Descending order: Newest doubts appear at the top
      });

      setHistoricalDoubts(issues);
    }, (error) => {
      console.error("Pipeline breakdown:", error);
    });

    return () => unsubscribe();
  }, [studentUsn]);

  // Invokes matching algorithms on the description input text string
  const handleAnalyzeAndOpenSelector = async (e) => {
    e.preventDefault();
    setFeedback({ type: "", msg: "" });

    const promptText = singleDoubtInput.trim();
    if (!promptText) {
      setFeedback({ type: "error", msg: "Please enter your doubt details for analysis." });
      return;
    }

    setAnalyzingPool(true);

    try {
      // Clean and normalize incoming string input to parse words safely
      const cleanKeywords = promptText
        .toLowerCase()
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .split(/\s+/)
        .filter((word) => word.length > 2);

      const uniqueKeywords = Array.from(new Set(cleanKeywords));
      
      // Query the primary 'faculty' master collection as verified in your database setup
      const facultySnapshot = await getDocs(collection(db, "faculty"));
      const scoringMatrix = [];

      facultySnapshot.forEach((doc) => {
        const fac = doc.data();
        const facultySapId = doc.id; // The document ID is the alphanumeric SAP ID (e.g. "5544")

        if (fac.expertise && Array.isArray(fac.expertise)) {
          // Verify if any keyword from the prompt matches the faculty's expertise array tokens
          const matches = fac.expertise.filter((skill) => 
            uniqueKeywords.some(keyword => skill.toLowerCase().trim().includes(keyword))
          );
          
          if (matches.length > 0) {
            scoringMatrix.push({
              id: facultySapId, // Evaluated to the exact SAP ID for seamless conditional dashboard triggers
              name: fac.name || "Faculty Member",
              department: fac.department || "General Academics",
              score: matches.length,
              matchedExpertise: matches.join(", ")
            });
          }
        }
      });

      // Sort by absolute highest score descending to surface best recommendations first
      const topMatches = scoringMatrix
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);

      // Secure institutional counselor fallback configuration if keyword scanning yielded an empty matrix
      if (topMatches.length === 0) {
        topMatches.push({
          id: counsellorSapId || "8858",
          name: "Academic Counselor (Default Router)",
          department: "Department Hub",
          score: 0,
          matchedExpertise: "General Fallback Routing"
        });
      }

      setMatchedFacultyPool(topMatches);
      setSelectedFacultyId(topMatches[0]?.id || null);
      setAssignDialogOpen(true);

    } catch (err) {
      console.error("Match Matrix Processing Failure:", err);
      setFeedback({ type: "error", msg: "Expertise mapping arrays analysis failure." });
    } finally {
      setAnalyzingPool(false);
    }
  };

  // Writes the final query payload using the chosen professor's SAP ID
// Writes the final query payload using the chosen professor's SAP ID
  const finalizeDoubtAssignment = async () => {
    if (!selectedFacultyId) return;
    setAnalyzingPool(true);

    try {
      const promptText = singleDoubtInput.trim();
      const cleanKeywords = promptText
        .toLowerCase()
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .split(/\s+/)
        .filter((word) => word.length > 2);

      const headerExcerpt = promptText.split(/[.!?]/)[0].substring(0, 55) + "...";
      
      // Look up the selected choice from our matched recommendation pool to safely assign its metadata details
      const chosenFaculty = matchedFacultyPool.find(f => f.id === selectedFacultyId);

      // This object structure directly matches what FacultyDashboard expects to receive
      await addDoc(collection(db, "doubts"), {
        // Core tracking fields mapped directly to your database keys
        studentUsn: studentUsn, 
        studentName: studentName,
        title: headerExcerpt,
        description: promptText,
        searchKeywords: Array.from(new Set(cleanKeywords)),
        
        // Setup dual alignment mapping keys matching your FacultyDashboard queries perfectly
        assignedFacultyId: selectedFacultyId, // Populates with the Faculty's real SAP ID (e.g. "5544")
        assignedFacultyName: chosenFaculty ? chosenFaculty.name : "Faculty Member",
        
        // Extract the upper-cased matched subject skill tag so FacultyDashboard doesn't render empty fields
        subject: chosenFaculty && chosenFaculty.score > 0 ? chosenFaculty.matchedExpertise.split(", ")[0].toUpperCase() : "GENERAL / NO MATCH",
        
        status: "assigned", // Set directly to 'assigned' to route smoothly into the teacher's dashboard queue
        rejectedBy: [],
        createdAt: serverTimestamp(),
        resolvedAt: null,
        solutionSummary: null
      });

      setFeedback({ type: "success", msg: `Doubt successfully locked and routed to ${chosenFaculty?.name || 'Selected Faculty'}!` });
      setSingleDoubtInput("");
      setAssignDialogOpen(false);
    } catch (err) {
      console.error("Database tracking dispatch error:", err);
      setFeedback({ type: "error", msg: `Failed to dispatch database write: ${err.message}` });
    } finally {
      setAnalyzingPool(false);
    }
  };

  const filteredDoubts = historicalDoubts.filter(item => 
    (item.description || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
    (item.title || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box>
      <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
        <IconButton onClick={onBack} sx={{ color: "white", bgcolor: "rgba(255,255,255,0.05)" }}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h5" fontWeight={700}>Doubt Resolution Panel</Typography>
          <Typography variant="caption" sx={{ color: "#c6c5d7", opacity: 0.6 }}>Full-Width Expanded Workspace Component Layout</Typography>
        </Box>
      </Box>

      {feedback.msg && <Alert severity={feedback.type} sx={{ mb: 3, borderRadius: 2 }}>{feedback.msg}</Alert>}

      {/* FULL-WIDTH CONSOLE INPUT WORKSPACE CARD PANE */}
      <Card sx={{ bgcolor: "rgba(22, 24, 25, 0.7)", borderRadius: 3, border: "1px solid rgba(192, 193, 255, 0.15)", mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 1.5, color: "rgba(255,255,255,0.8)" }}>
            Describe your technical or academic issue:
          </Typography>
          <Box component="form" onSubmit={handleAnalyzeAndOpenSelector}>
            <TextField
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              value={singleDoubtInput}
              onChange={(e) => setSingleDoubtInput(e.target.value)}
              placeholder="Paste terminal logs or type academic questions here. The engine will match and list the top 3-4 professors specializing in this topic for your final selection..."
              sx={{
                mb: 2,
                "& .MuiOutlinedInput-root": {
                  color: "white",
                  bgcolor: "rgba(0,0,0,0.25)",
                  "& fieldset": { borderColor: "rgba(255,255,255,0.08)" }
                }
              }}
            />
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                type="submit"
                variant="contained"
                color="secondary"
                disabled={analyzingPool}
                sx={{ px: 5, py: 1.2, fontWeight: 700, textTransform: "none", borderRadius: 2 }}
              >
                {analyzingPool ? <CircularProgress size={20} color="inherit" /> : "Analyze & Match Faculty"}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* CONTROL FILTER INPUT */}
      <Box sx={{ mb: 3 }}>
        <TextField
          size="small"
          placeholder="Filter active pipeline entries..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: "rgba(255,255,255,0.3)", mr: 1, fontSize: 20 }} />
          }}
          sx={{
            width: 320,
            "& .MuiOutlinedInput-root": {
              color: "white",
              bgcolor: "rgba(255,255,255,0.03)",
              borderRadius: 2,
              "& fieldset": { borderColor: "rgba(255,255,255,0.08)" }
            }
          }}
        />
      </Box>

      {/* COMPONENT RECENT PIPELINE VIEW LEDGER GRID */}
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
        Active Query Pipeline Ledger ({filteredDoubts.length})
      </Typography>

      <Stack spacing={2}>
        {filteredDoubts.length === 0 ? (
          <Box sx={{ p: 6, textAlign: "center", bgcolor: "rgba(0,0,0,0.1)", borderRadius: 3, border: "1px dashed rgba(255,255,255,0.05)" }}>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.3)" }}>No matching inquiries found in active pipeline registers.</Typography>
          </Box>
        ) : (
          filteredDoubts.map((issue) => (
            <Card 
              key={issue.id} 
              onClick={() => {
                setSelectedDoubt(issue);
                setOpenChat(true);
              }}
              sx={{ 
                bgcolor: "rgba(25, 27, 28, 0.6)", 
                border: "1px solid rgba(255, 255, 255, 0.05)", 
                borderRadius: 2.5, 
                color: "white",
                cursor: "pointer", // Added pointer feedback cursor smoothly
                transition: "0.2s",
                "&:hover": { transform: "translateY(-2px)", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                  <Typography variant="body1" fontWeight={700} color="#e2e2e4">{issue.title}</Typography>
                  <Chip 
                    label={issue.status.toUpperCase()} 
                    size="small"
                    sx={{
                      bgcolor: issue.status === "pending" ? "rgba(255, 183, 77, 0.12)" : "rgba(76, 175, 80, 0.12)",
                      color: issue.status === "pending" ? "#ffb74d" : "#4caf50",
                      fontWeight: 800,
                      fontSize: "0.72rem",
                      borderRadius: 1
                    }}
                  />
                </Box>
                <Typography variant="body2" sx={{ color: "#c6c5d7", opacity: 0.85, mb: 2 }}>{issue.description}</Typography>
                <Divider sx={{ borderColor: "rgba(255,255,255,0.05)", mb: 1.5 }} />
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)" }}>
                    Assigned Faculty Identifier: <span style={{ color: "#c0c1ff", fontFamily: "monospace" }}>{issue.assignedFacultyId}</span>
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          ))
        )}
      </Stack>

      {/* --- INTEGRATED ASSIGNMENT CHANNELS DIALOG DIALOG OVERLAY (Refactored Blueprint) --- */}
      <Dialog 
        open={assignDialogOpen} 
        onClose={() => setAssignDialogOpen(false)}
        PaperProps={{
          sx: { bgcolor: "#1a1c1d", color: "white", borderRadius: 4, border: "1px solid rgba(255,255,255,0.1)", width: "100%", maxWidth: 500 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          Top Expert Recommendations
        </DialogTitle>
        <DialogContent sx={{ mt: 2, p: 3 }}>
          <Typography variant="body2" sx={{ color: "#c6c5d7", mb: 2.5 }}>
            The text engine matches the highest overlapping expertise tags. Select your preferred professor below to route the ticket:
          </Typography>

          <Stack spacing={2}>
            {matchedFacultyPool.map((f) => {
              const isSelected = f.id === selectedFacultyId;
              return (
                <Card
                  key={f.id}
                  onClick={() => setSelectedFacultyId(f.id)}
                  sx={{
                    cursor: "pointer",
                    bgcolor: isSelected ? "rgba(192, 193, 255, 0.12)" : "rgba(255,255,255,0.02)",
                    border: isSelected ? "1px solid #c0c1ff" : "1px solid rgba(255,255,255,0.06)",
                    color: "white",
                    borderRadius: 2.5,
                    transition: "all 0.2s ease"
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="body1" fontWeight={700} color={isSelected ? "#c0c1ff" : "white"}>
                      {f.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#c6c5d7", display: "block", mt: 0.5 }}>
                      Department Branch: {f.department} | SAP ID: <span style={{ fontFamily: "monospace" }}>{f.id}</span>
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#ffb0ce", display: "block", mt: 0.5, fontWeight: 600 }}>
                      Overlap Keywords Matched: {f.matchedExpertise || "None (General)"}
                    </Typography>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <Button onClick={() => setAssignDialogOpen(false)} color="error" sx={{ textTransform: "none", fontWeight: 600 }}>Cancel</Button>
          <Button 
            onClick={finalizeDoubtAssignment} 
            variant="contained" 
            color="secondary" 
            disabled={!selectedFacultyId}
            sx={{ textTransform: "none", fontWeight: 700, px: 3, borderRadius: 2 }}
          >
            Assign Query Token
          </Button>
        </DialogActions>
      </Dialog>
      {selectedDoubt && (
        <DoubtResolutionDialog
          open={openChat}
          onClose={() => setOpenChat(false)}
          doubt={selectedDoubt}
          isFaculty={false}
        />
      )}
    </Box>
  );
};

export default StudentDashboard;