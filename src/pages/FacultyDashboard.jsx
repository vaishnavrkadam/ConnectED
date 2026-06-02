import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Button,
  Chip,
  Divider,
  Box,
  Alert,
  CircularProgress,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
  Avatar,
  useTheme
} from "@mui/material";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDocs,
  or
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import FacultyInterestGroupsControl from "../components/FacultyInterestGroupsControl";
import DoubtResolutionDialog from '../components/DoubtResolutionDialog';
import ScheduleDoubtMeeting from '../components/ScheduleDoubtMeeting';
import AcceptChoiceDialog from '../components/AcceptChoiceDialog'; 
import ProfileSettings from '../components/ProfileSettings';
import ContactFacultyDialog from '../components/ContactFacultyDialog';
import ActionSuccessDialog from '../components/ActionSuccessDialog'; 

// Icons Sourced for Exact Uniformity
import DashboardIcon from "@mui/icons-material/Dashboard";
import QuestionAnswerIcon from "@mui/icons-material/QuestionAnswer";
import GroupsIcon from "@mui/icons-material/Groups";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import EditIcon from "@mui/icons-material/Edit";
import LogoutIcon from "@mui/icons-material/Logout";

import ClubRequestDetailDialog from "../components/ClubRequestDetailDialog";
import collegeBg from "../assets/college-bg-entr.jpg";
import FacultyAppointmentsPortal from "../components/FacultyAppointmentsPortal";
import EventIcon from "@mui/icons-material/Event";

const getAsDate = (val) => {
  if (!val) return new Date(0);
  if (typeof val.toDate === 'function') return val.toDate();
  return new Date(val);
};

const FacultyDashboard = () => {
  const { user, profile, loading, signOut } = useAuth();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState("overview");
  
  const [appointments, setAppointments] = useState([]);
  const [assignedDoubts, setAssignedDoubts] = useState([]);
  const [error, setError] = useState("");
  
  // Club Operations Panel States
  const [managedClub, setManagedClub] = useState(null);
  const [incomingClubRequests, setIncomingClubRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [openRequestDetails, setOpenRequestDetails] = useState(false);
  const [rosterEditingUsn, setRosterEditingUsn] = useState("");
  const [targetNewRole, setTargetNewRole] = useState("");
  const [globalUserRegistry, setGlobalUserRegistry] = useState({});

  // UI Dialog Management States
  const [openResolution, setOpenResolution] = useState(false);
  const [selectedDoubt, setSelectedDoubt] = useState(null);
  const [openScheduling, setOpenScheduling] = useState(false); 
  const [doubtForScheduling, setDoubtForScheduling] = useState(null); 
  const [doubtToAccept, setDoubtToAccept] = useState(null); 
  const [openProfileSettings, setOpenProfileSettings] = useState(false);
  const [openContactFaculty, setOpenContactFaculty] = useState(false); 
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupContent, setPopupContent] = useState({ title: "", message: "" });
  
  const handleClosePopup = () => setPopupOpen(false);

  // User Registry Listener
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const usersMap = {};
      snapshot.forEach((docSnap) => {
        const uData = docSnap.data();
        if (uData.primaryId) {
          usersMap[uData.primaryId.toUpperCase()] = uData.name;
        }
      });
      setGlobalUserRegistry(usersMap);
    });
    return () => unsubUsers();
  }, []);

  // Doubts & Appointments Pipeline Real-Time Listener
  useEffect(() => {
    if (!user || !profile) return; 

    const qA = query(collection(db, "appointments"), where("facultyId", "==", user.uid));
    const unsubA = onSnapshot(qA, (snap) => {
      const items = [];
      snap.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
      setAppointments(items.sort((a, b) => getAsDate(b.createdAt).getTime() - getAsDate(a.createdAt).getTime()));
    });

    const conditionsD = [];
    if (profile?.primaryId) conditionsD.push(where("assignedFacultyId", "==", profile.primaryId));
    if (user?.uid) conditionsD.push(where("assignedFacultyId", "==", user.uid));

    if (conditionsD.length > 0) {
      const qD = query(collection(db, "doubts"), conditionsD.length > 1 ? or(...conditionsD) : conditionsD[0]);
      const unsubD = onSnapshot(qD, (snap) => {
        const items = [];
        snap.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
        setAssignedDoubts(items.sort((a, b) => getAsDate(b.createdAt).getTime() - getAsDate(a.createdAt).getTime()));
      });
      return () => { unsubA(); unsubD(); };
    }
    return () => unsubA();
  }, [user, profile]);

  // Live Club Management Listener
  useEffect(() => {
    if (!profile?.primaryId) return;

    const clubQuery = query(collection(db, "clubs"), where("coordinatorSapId", "==", profile.primaryId));
    const unsubClub = onSnapshot(clubQuery, (snapshot) => {
      snapshot.forEach((docSnap) => {
        setManagedClub({ id: docSnap.id, ...docSnap.data() });
      });
    });

    const requestsQuery = query(collection(db, "club_requests"), where("coordinatorSapId", "==", profile.primaryId));
    const unsubReqs = onSnapshot(requestsQuery, (snapshot) => {
      const buffer = [];
      snapshot.forEach((d) => buffer.push({ id: d.id, ...d.data() }));
      setIncomingClubRequests(buffer.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
    });

    return () => { unsubClub(); unsubReqs(); };
  }, [profile]);

  // Roster rank management
  const handleModifyMemberRole = async (targetUsn) => {
    if (!targetNewRole.trim() || !managedClub) return;
    try {
      const updatedMembersMap = { ...managedClub.members };
      const normalizedRole = targetNewRole.trim();
      
      if (normalizedRole.toLowerCase() === "president") {
        Object.keys(updatedMembersMap).forEach((usnKey) => {
          if (updatedMembersMap[usnKey].role === "President") {
            updatedMembersMap[usnKey].role = "Member";
          }
        });
        await updateDoc(doc(db, "clubs", managedClub.id), {
          presidentUsn: targetUsn,
          [`members.${targetUsn}.role`]: "President"
        });
      } else {
        updatedMembersMap[targetUsn].role = normalizedRole;
      }

      await updateDoc(doc(db, "clubs", managedClub.id), { members: updatedMembersMap });
      setPopupContent({ title: "Roster Role Updated", message: `Successfully reassigned role of ${targetUsn} to "${normalizedRole}".` });
      setPopupOpen(true);
      setRosterEditingUsn("");
    } catch (err) {
      setError("Failed to modify member roster rank.");
    }
  };

  // Reassignment matrix algorithms
  const reassignDoubt = async (rejectedDoubt) => {
      setError("");
      const snap = await getDocs(query(collection(db, "users"), where("role", "==", "faculty")));
      const doubtContent = rejectedDoubt.description || rejectedDoubt.doubt || "";
      const words = doubtContent.toLowerCase().split(/\s+/);
      let bestMatch = null; let matchedExpertise = null; let bestScore = 0;

      snap.forEach((doc) => {
          const data = doc.data();
          if (doc.id === user.uid) return; 
          const expertiseList = (data.expertise || []).map((e) => e.toLowerCase()); 
          let score = 0; let localMatch = null;
          words.forEach((w) => {
              if (w.length > 2) {
                  expertiseList.forEach((e) => {
                      if (e.includes(w)) { score++; localMatch = e; }
                  });
              }
          });
          if (score > bestScore) {
              bestScore = score; bestMatch = data; bestMatch.id = doc.id; matchedExpertise = localMatch;
          }
      });

      const updateData = { lastRejectedBy: user.email, rejectionTimestamp: new Date().toISOString() };
      if (bestMatch && bestScore > 0) {
          updateData.assignedFacultyId = bestMatch.primaryId || bestMatch.id; 
          updateData.assignedFacultyName = bestMatch.name;
          updateData.status = "assigned"; 
          updateData.subject = matchedExpertise.toUpperCase(); 
          setPopupContent({ title: "Doubt Reassigned!", message: `The query has been successfully routed to ${bestMatch.name} for resolution.` });
      } else {
          updateData.assignedFacultyId = null; updateData.assignedFacultyName = "No Expert Found (Pending)"; updateData.status = "pending";
          setPopupContent({ title: "Reassigned to Pending", message: "No new expert could be matched. The doubt is now back in the pending pool." });
      }
      setPopupOpen(true);
      await updateDoc(doc(db, "doubts", rejectedDoubt.id), updateData);
  };
  
  const handleDoubtAction = async (doubt, action) => {
    setError("");
    try {
        if (action === "accept_online") {
            await updateDoc(doc(db, "doubts", doubt.id), { status: "accepted" });
            setSelectedDoubt({...doubt, status: "accepted"});
            setOpenResolution(true);
        } else if (action === "reject") {
            await updateDoc(doc(db, "doubts", doubt.id), { status: "rejected" });
            await reassignDoubt(doubt);
        }
    } catch (e) { setError(`Failed to perform action (${action}) on doubt.`); }
  };

  const handleChoiceFromDialog = (choice) => {
    if (choice === 'online') handleDoubtAction(doubtToAccept, "accept_online");
    else { setDoubtForScheduling(doubtToAccept); setOpenScheduling(true); }
    setDoubtToAccept(null); 
  };
  
  const finalizeOfflineSchedule = async (slot) => {
    if (!doubtForScheduling || !slot) return;
    try {
        await updateDoc(doc(db, "doubts", doubtForScheduling.id), { 
            status: "scheduled", 
            assignedFacultyId: profile.primaryId || user.uid, 
            assignedFacultyName: profile?.name || user?.email || "Faculty Member", 
            scheduleSlot: { day: slot.day, time: slot.time, location: slot.location || 'Faculty Office' }
        });
        setPopupContent({ title: "Appointment Confirmed!", message: `Meeting scheduled with student for ${slot.day} at ${slot.time}.` });
        setPopupOpen(true); setDoubtForScheduling(null); setOpenScheduling(false);
    } catch (e) { setError("Failed to finalize offline schedule."); }
  };

  const updateAppointmentStatus = async (id, status) => {
    try { await updateDoc(doc(db, "appointments", id), { status }); } catch (e) { setError("Failed to update status."); }
  };

  const statusColor = (s) => {
    if (s === "accepted" || s === "resolved" || s === "approved") return "success";
    if (s === "rejected") return "error";
    return "info";
  };

  const handleOpenDoubtChat = (doubt) => {
    setSelectedDoubt(doubt);
    setOpenResolution(true);
  };

  const facultyName = profile?.name || user?.email;
  const sapIdentifier = profile?.primaryId || "Admin Unassigned";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        // Matched exact glassmorphic template background overlays from Student View layout spec
        backgroundImage: `linear-gradient(rgba(12, 14, 16, 0.92), rgba(12, 14, 16, 0.97)), url(${collegeBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        color: "#e2e2e4",
        display: "flex",
        flexDirection: { xs: "column", md: "row" }
      }}
    > 
      {/* --- SIDEBAR PANEL NAVIGATION (UNIFORM REPLICA) --- */}
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
            {facultyName.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ maxWidth: 170 }}>
              {facultyName}
            </Typography>
            <Typography variant="caption" sx={{ color: "#c6c5d7", opacity: 0.8 }}>
              {sapIdentifier}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ borderColor: "rgba(255,255,255,0.08)", mb: 2 }} />

        <List sx={{ p: 0 }}>
          {[
            { id: "overview", text: "Dashboard Overview", icon: <DashboardIcon /> },
            { id: "doubts", text: "Doubt Management", icon: <QuestionAnswerIcon /> },
            { id: "clubs", text: "Club Operations", icon: <GroupsIcon /> },
            { id: "interest_control", text: "Interest Group Controls", icon: <GroupsIcon /> },
            { id: "appointments", text: "Appointment Bookings", icon: <EventIcon /> }
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

        <Box sx={{ flexGrow: 1 }} />

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

      {/* --- MAIN WORKSPACE CONSOLE WINDOW --- */}
      <Box sx={{ flexGrow: 1, p: { xs: 2, sm: 4, md: 5 }, overflowY: "auto", maxHeight: "100vh" }}>
        
        {/* VIEW 1: MASTER OVERVIEW SYNC DASHBOARD */}
        {activeTab === "overview" && (
          <Box>
            <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
              <Box>
                <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: "-0.5px", color: "white" }}>
                  Faculty Workspace
                </Typography>
                <Typography variant="body2" sx={{ color: "#c6c5d7", opacity: 0.85, mt: 0.5 }}>
                  Institutional Guidance & Claims Verification Matrix
                </Typography>
              </Box>
              <Chip
                label={`SAP ID: ${sapIdentifier}`}
                sx={{
                  bgcolor: "rgba(192, 193, 255, 0.15)",
                  color: "#c0c1ff",
                  fontWeight: 700,
                  border: "1px solid rgba(192, 193, 255, 0.25)",
                  borderRadius: "8px"
                }}
              />
            </Box>

            {/* QUICK ACTIONS ACTION CONTROLS HUB */}
            <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
              <Button variant="outlined" color="secondary" onClick={() => setOpenProfileSettings(true)} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>
                Edit Profile & Expertise
              </Button>
              <Button variant="contained" color="primary" onClick={() => setOpenContactFaculty(true)} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, bgcolor: "#4f46e5" }}>
                Contact Other Faculties
              </Button>
            </Stack>

            <Grid container spacing={3.5}>
              <Grid item xs={12} lg={4}>
                <Card sx={{ bgcolor: "rgba(30, 32, 33, 0.5)", backdropFilter: "blur(20px)", borderRadius: 4, border: "1px solid rgba(255, 255, 255, 0.1)", color: "white" }}>
                  <CardContent sx={{ p: 4 }}>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 3, color: "#c0c1ff" }}>Account Metadata</Typography>
                    <Stack spacing={2.5}>
                      <Box>
                        <Typography variant="caption" sx={{ color: "#c6c5d7", display: "block", mb: 0.5 }}>PROFESSIONAL DISCIPLINE</Typography>
                        <Typography variant="body1" fontWeight={600}>{profile?.department || "General Academics"}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: "#c6c5d7", display: "block", mb: 0.5 }}>VERIFIED EMAIL</Typography>
                        <Typography variant="body1" fontWeight={600} sx={{ fontFamily: "monospace" }}>{profile?.email || user?.email}</Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6} lg={4}>
                <Card sx={{ bgcolor: "rgba(30, 32, 33, 0.5)", backdropFilter: "blur(20px)", borderRadius: 4, border: "1px solid rgba(255, 255, 255, 0.1)", color: "white", height: "100%" }}>
                  <CardContent sx={{ p: 4, display: "flex", flexDirection: "column", height: "100%" }}>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 3, color: "#ffb0ce" }}>Counseling Queue</Typography>
                    <Stack spacing={2} sx={{ flexGrow: 1, justifyContent: "center" }}>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Typography variant="body1" fontWeight={600}>Pending Bookings</Typography>
                        <Typography variant="h5" fontWeight={800} sx={{ ml: "auto", color: "#ffb74d" }}>
                          {appointments.filter(a => a.status === "pending").length}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Typography variant="body1" fontWeight={600}>Total Appointments</Typography>
                        <Typography variant="h5" fontWeight={800} sx={{ ml: "auto", color: "#4caf50" }}>
                          {appointments.length}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6} lg={4}>
                <Card sx={{ bgcolor: "rgba(30, 32, 33, 0.5)", backdropFilter: "blur(20px)", borderRadius: 4, border: "1px solid rgba(255, 255, 255, 0.1)", color: "white" }}>
                  <CardContent sx={{ p: 4 }}>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: "#e2e2e4" }}>Quick Action Links</Typography>
                    <List disablePadding>
                      {[
                        { text: "Review Active Doubts", action: () => setActiveTab("doubts") },
                        { text: "Manage Assigned Clubs", action: () => setActiveTab("clubs") }
                      ].map((actionItem, idx) => (
                        <Box key={idx}>
                          <ListItem disablePadding sx={{ py: 1.5, cursor: "pointer" }} onClick={actionItem.action}>
                            <ListItemText primary={actionItem.text} primaryTypographyProps={{ fontSize: "0.92rem", fontWeight: 600, color: '#c0c1ff' }} />
                          </ListItem>
                          {idx < 1 && <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />}
                        </Box>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* VIEW 2: REFACTORED DOUBT RESUME WORKSPACE ROUTE PANEL */}
        {activeTab === "doubts" && (
          <Card sx={{ bgcolor: "rgba(30, 32, 33, 0.5)", backdropFilter: "blur(20px)", borderRadius: 4, border: "1px solid rgba(255, 255, 255, 0.1)", color: "white" }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" fontWeight={800} sx={{ mb: 2, color: "#c0c1ff" }}>Doubt Resolution Stream</Typography>
              <Divider sx={{ borderColor: "rgba(255,255,255,0.08)", mb: 3 }} />
              
              {assignedDoubts.length === 0 ? (
                <Alert severity="info" sx={{ bgcolor: "rgba(0,0,0,0.2)", color: "#cbd5e1" }}>No queries currently mapped to your focus keys.</Alert>
              ) : (
                <Grid container spacing={2.5}>
                  {assignedDoubts.map((d) => (
                    <Grid item xs={12} md={6} key={d.id}>
                      <Card 
                        variant="outlined" 
                        onClick={() => handleOpenDoubtChat(d)}
                        sx={{ 
                          cursor: 'pointer', 
                          bgcolor: 'rgba(255,255,255,0.02)', 
                          borderColor: d.status === 'assigned' ? 'orange' : 'rgba(255,255,255,0.08)',
                          color: 'white',
                          transition: '0.2s',
                          "&:hover": { bgcolor: "rgba(255,255,255,0.05)", transform: "translateY(-2px)" }
                        }}
                      >
                        <CardContent sx={{ p: 2.5 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box>
                              <Typography variant="body1" fontWeight={700} color="#c0c1ff">{d.title || d.subject}</Typography>
                              <Typography variant="caption" sx={{ color: "#9ca3af" }}>Student: {d.studentName || d.studentEmail}</Typography>
                            </Box>
                            <Chip label={d.status.toUpperCase()} color={statusColor(d.status)} size="small" sx={{ fontWeight: 800, fontSize: '0.65rem' }} />
                          </Stack>
                          <Typography mt={1.5} fontStyle="italic" variant="body2" color="#cbd5e1">
                            " {d.description || d.doubt} "
                          </Typography>
                          
                          {d.status === "assigned" && (
                            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }} onClick={(e)=>e.stopPropagation()}>
                              <Button variant="contained" size="small" onClick={() => setDoubtToAccept(d)} sx={{ textTransform: "none", fontSize: "0.75rem" }}>Accept</Button>
                              <Button variant="outlined" color="error" size="small" onClick={() => handleDoubtAction(d, "reject")} sx={{ textTransform: "none", fontSize: "0.75rem" }}>Reject</Button>
                            </Stack>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        )}

        {/* VIEW 3: SEPARATED REFACTORED CLUB MANAGEMENT CONSOLE */}
        {activeTab === "clubs" && (
          <Box>
            {!managedClub ? (
              <Alert severity="warning" sx={{ bgcolor: "rgba(0,0,0,0.2)", color: "#cbd5e1" }}>You are not registered as Faculty Coordinator for any active student organization records.</Alert>
            ) : (
              <Grid container spacing={3.5}>
                
                {/* DYNAMIC CLAIMS APPROVALS LEDGER TABLE */}
                <Grid item xs={12} md={7}>
                  <Card sx={{ bgcolor: "rgba(30, 32, 33, 0.5)", backdropFilter: "blur(20px)", borderRadius: 4, border: "1px solid rgba(255, 255, 255, 0.1)", color: "white" }}>
                    <CardContent sx={{ p: 4 }}>
                      <Typography variant="h5" fontWeight={800} color="primary.main">Club Approvals Pipeline ({managedClub.clubName})</Typography>
                      <Divider sx={{ borderColor: "rgba(255,255,255,0.08)", my: 2 }} />
                      
                      {incomingClubRequests.filter(r => r.status === "pending_coordinator").length === 0 ? (
                        <Alert severity="info" sx={{ bgcolor: "rgba(0,0,0,0.2)", color: "#cbd5e1" }}>No active point or attendance verification claims pending.</Alert>
                      ) : (
                        <Stack spacing={2} sx={{ mt: 2 }}>
                          {incomingClubRequests.filter(r => r.status === "pending_coordinator").map((req) => (
                            <Card key={req.id} variant="outlined" onClick={() => { setSelectedRequest(req); setOpenRequestDetails(true); }} sx={{ cursor: "pointer", bgcolor: "rgba(255,255,255,0.01)", borderColor: "rgba(255,255,255,0.06)", color: "white", "&:hover": { bgcolor: "rgba(255,255,255,0.04)" } }}>
                              <CardContent sx={{ p: 2 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                  <Box>
                                    <Typography variant="body1" fontWeight={700} color="#ffb0ce">{req.eventName}</Typography>
                                    <Typography variant="caption" sx={{ color: "#9ca3af" }}>Category: {req.requestType.toUpperCase()} | Participants: {req.participants?.length || 0} rows</Typography>
                                  </Box>
                                  <Button variant="contained" color="secondary" size="small" sx={{ textTransform: "none", fontSize: "0.75rem" }}>Review Claim</Button>
                                </Stack>
                              </CardContent>
                            </Card>
                          ))}
                        </Stack>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                {/* VERIFIED MEMBER ROSTER MANAGER PANE */}
                <Grid item xs={12} md={5}>
                  <Card sx={{ bgcolor: "rgba(30, 32, 33, 0.5)", backdropFilter: "blur(20px)", borderRadius: 4, border: "1px solid rgba(255, 255, 255, 0.1)", color: "white" }}>
                    <CardContent sx={{ p: 4 }}>
                      <Typography variant="h5" fontWeight={800} color="secondary.main">Member Roster Control</Typography>
                      <Divider sx={{ borderColor: "rgba(255,255,255,0.08)", my: 2 }} />
                      
                      <List sx={{ maxHeight: 340, overflowY: "auto", bgcolor: "rgba(0,0,0,0.2)", borderRadius: 3, p: 1 }}>
                        {Object.keys(managedClub.members || {}).map((usnKey) => {
                          const m = managedClub.members[usnKey];
                          const isEditing = rosterEditingUsn === usnKey;
                          const verifiedCleanName = globalUserRegistry[usnKey.toUpperCase()] || m.name.replace(/Member\s*\(.*?\)/gi, "").trim() || `Cadet (${usnKey})`;

                          return (
                            <ListItem key={usnKey} sx={{ borderBottom: "1px solid rgba(255,255,255,0.04)", flexDirection: "column", alignItems: "flex-start", p: 1.5 }}>
                              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ width: "100%" }}>
                                <Avatar sx={{ bgcolor: "#ec4899", width: 32, height: 32, fontSize: "0.85rem", fontWeight: 700 }}>{verifiedCleanName.charAt(0)}</Avatar>
                                <Box>
                                  <Typography variant="body2" fontWeight={700} color="white">{verifiedCleanName}</Typography>
                                  <Typography variant="caption" sx={{ color: "rgba(192, 193, 255, 0.6)", fontFamily: "monospace" }}>{usnKey}</Typography>
                                </Box>
                                <Chip label={m.role} size="small" color={m.role === "President" ? "secondary" : "default"} sx={{ ml: "auto", fontSize: "0.65rem", fontWeight: 800 }} />
                              </Stack>
                              
                              {isEditing ? (
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%", mt: 1.5 }}>
                                  <TextField
                                    size="small"
                                    fullWidth
                                    label="Enter Custom Rank"
                                    value={targetNewRole}
                                    onChange={(e) => setTargetNewRole(e.target.value)}
                                    placeholder="e.g. Captain, Core Team, Sergeant"
                                    inputProps={{ style: { color: "white", fontSize: "0.85rem" } }}
                                    sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}
                                  />
                                  <Button size="small" variant="contained" color="success" onClick={() => handleModifyMemberRole(usnKey)} sx={{ textTransform: "none" }}>Save</Button>
                                  <Button size="small" variant="outlined" color="inherit" onClick={() => setRosterEditingUsn("")} sx={{ textTransform: "none" }}>Cancel</Button>
                                </Stack>
                              ) : (
                                <Button 
                                  size="small" 
                                  variant="text" 
                                  onClick={() => { setRosterEditingUsn(usnKey); setTargetNewRole(m.role); }} 
                                  sx={{ alignSelf: "flex-end", textTransform: "none", fontSize: "0.7rem", color: "#c0c1ff", mt: 0.5 }}
                                >
                                  Edit Custom Rank
                                </Button>
                              )}
                            </ListItem>
                          );
                        })}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

              </Grid>
            )}
          </Box>
        )}
        {/* VIEW 4: ROUTE MAP TARGET TO INTEREST GROUPS CLEARANCE CONTROL */}
        {activeTab === "interest_control" && (
          <FacultyInterestGroupsControl
            facultySapId={sapIdentifier} // Transmits the active professor's unique login ID parameter safely
          />
        )}
        {activeTab === "appointments" && (
          <FacultyAppointmentsPortal
            facultySapId={sapIdentifier} // References the logged-in teacher's active workspace identification key safely
          />
        )}

      </Box>

      {/* DIALOG MASTER PORTAL OVERLAYS */}
      {selectedDoubt && <DoubtResolutionDialog open={openResolution} onClose={() => setOpenResolution(false)} doubt={selectedDoubt} isFaculty={true} />}
      {doubtForScheduling && <ScheduleDoubtMeeting open={openScheduling} onClose={() => setOpenScheduling(false)} doubt={doubtForScheduling} onScheduleFinalized={finalizeOfflineSchedule} />}
      {doubtToAccept && <AcceptChoiceDialog open={!!doubtToAccept} onClose={() => setDoubtToAccept(null)} doubt={doubtToAccept} onChooseOnline={() => handleChoiceFromDialog('online')} onChooseOffline={() => handleChoiceFromDialog('offline')} />}
      <ProfileSettings open={openProfileSettings} onClose={() => setOpenProfileSettings(false)} />
      <ContactFacultyDialog open={openContactFaculty} onClose={() => setOpenContactFaculty(false)} />
      <ActionSuccessDialog open={popupOpen} handleClose={handleClosePopup} title={popupContent.title} message={popupContent.message} />
      <ClubRequestDetailDialog open={openRequestDetails} onClose={() => setOpenRequestDetails(false)} request={selectedRequest} isFaculty={true} />
    </Box>
  );
};

export default FacultyDashboard;