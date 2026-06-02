// src/pages/DeanDashboard.jsx
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
  Avatar,
  List,
  ListItem,
  ListItemText,
  TextField,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from "@mui/material";
import Layout from "../components/Layout";
import { db } from "../firebase";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  addDoc 
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

import LogoutIcon from "@mui/icons-material/Logout";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import GroupsIcon from "@mui/icons-material/Groups";
import CampaignIcon from "@mui/icons-material/Campaign";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import MailOutlineIcon from "@mui/icons-material/MailOutline";

import ClubRequestDetailDialog from "../components/ClubRequestDetailDialog";
import collegeBg from "../assets/college-bg-entr.jpg";

const DeanDashboard = () => {
  const { user, profile, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // System Core Data States
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [allClubs, setAllClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [openRequestDetails, setOpenRequestDetails] = useState(false);

  // Form Creation Handling States
  const [newClubId, setNewClubId] = useState("");
  const [newClubName, setNewClubName] = useState("");
  const [newClubPres, setNewClubPres] = useState("");
  const [newClubCoord, setNewClubCoord] = useState("");

  // Broadcast System State
  const [globalAnnTitle, setGlobalAnnTitle] = useState("");
  const [globalAnnContent, setGlobalAnnContent] = useState("");

  // Manual Direct Token Compensation States
  const [indivUsn, setIndivUsn] = useState("");
  const [indivName, setIndivName] = useState("");
  const [indivType, setIndivType] = useState("points");
  const [indivValue, setIndivValue] = useState("");
  const [indivReason, setIndivReason] = useState("");

  // 1. Live Sync Listeners for Multi-Tier Verification & Clubs Pool
  useEffect(() => {
    // FIX: Removed strict email constraint filter so the Dean captures ALL incoming requests validated by Coordinators
    const qRequests = query(collection(db, "club_requests"), where("status", "==", "pending_dean"));
    const unsubReqs = onSnapshot(qRequests, (snapshot) => {
      const buffer = [];
      snapshot.forEach((d) => buffer.push({ id: d.id, ...d.data() }));
      setIncomingRequests(buffer.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    });

    const qClubs = collection(db, "clubs");
    const unsubClubs = onSnapshot(qClubs, (snapshot) => {
      const buffer = [];
      snapshot.forEach((d) => buffer.push({ id: d.id, ...d.data() }));
      setAllClubs(buffer);
      if (buffer.length > 0 && !selectedClub) setSelectedClub(buffer[0]);
    });

    return () => { unsubReqs(); unsubClubs(); };
  }, []);

  // 2. Action: Create a New Club Record
  const handleCreateClub = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!newClubId.trim() || !newClubName.trim() || !newClubPres.trim() || !newClubCoord.trim()) {
      setError("Please complete all mandatory configuration field attributes.");
      return;
    }

    try {
      const targetId = newClubId.trim().toUpperCase();
      const clubPayload = {
        clubId: targetId,
        clubName: newClubName.trim(),
        presidentUsn: newClubPres.trim().toUpperCase(),
        coordinatorSapId: newClubCoord.trim(),
        announcements: [],
        members: {
          [newClubPres.trim().toUpperCase()]: { name: "Assigned Leader", role: "President" }
        }
      };

      await setDoc(doc(db, "clubs", targetId), clubPayload);
      setSuccess(`Successfully initialized club portfolio [${targetId}]`);
      setNewClubId(""); setNewClubName(""); setNewClubPres(""); setNewClubCoord("");
    } catch (err) {
      setError("Failed to initialize new data document.");
    }
  };

  // 3. Action: Dissolve an Inactive Club Portfolio
  const handleDissolveClub = async (clubId) => {
    if (!window.confirm(`Are you absolutely certain you want to dissolve and erase the club: [${clubId}]?`)) return;
    setError(""); setSuccess("");
    try {
      await deleteDoc(doc(db, "clubs", clubId));
      setSuccess(`Club portfolio [${clubId}] successfully dissolved from register sheets.`);
      setSelectedClub(allClubs.length > 1 ? allClubs[0] : null);
    } catch (err) {
      setError("Failed to clean database record parameters.");
    }
  };

  // 4. Action: Dispatch Global Student Broadcast
  const handlePublishBroadcast = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!globalAnnTitle.trim() || !globalAnnContent.trim()) return;

    try {
      await addDoc(collection(db, "global_announcements"), {
        title: globalAnnTitle.trim(),
        content: globalAnnContent.trim(),
        postedBy: "Office of Student Affairs",
        createdAt: new Date().toISOString()
      });
      setSuccess("Campus-wide administrative bulletin successfully broadcasted!");
      setGlobalAnnTitle(""); setGlobalAnnContent("");
    } catch (err) {
      setError("Failed to log broadcast tracking entry.");
    }
  };

  // 5. Action: Give Activity Points / Attendance to Individuals Directly
  const handleIssueIndividualToken = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!indivUsn.trim() || !indivName.trim() || !indivValue.trim() || !indivReason.trim()) {
      setError("Please verify individual claim parameter values.");
      return;
    }

    try {
      await addDoc(collection(db, "club_requests"), {
        clubId: "DEAN_OFFICE",
        clubName: "Office of Student Affairs (Direct Allocation)",
        eventName: indivReason.trim(),
        fromDate: new Date().toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
        requestType: indivType,
        proofUrl: "",
        participants: [{
          usn: indivUsn.trim().toUpperCase(),
          name: indivName.trim(),
          points: indivType !== "attendance" ? parseFloat(indivValue) : 0
        }],
        status: "approved", // Injects as approved directly to update totals instantly
        coordinatorSapId: "DIRECT",
        createdAt: new Date().toISOString()
      });

      setSuccess(`Direct administrative authorization token logged for student ${indivUsn.toUpperCase()}!`);
      setIndivUsn(""); setIndivName(""); setIndivValue(""); setIndivReason("");
    } catch (err) {
      setError("Failed to execute direct manual credit adjustment.");
    }
  };

  if (loading || !profile) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ minHeight: "100vh", backgroundImage: `linear-gradient(rgba(12, 14, 16, 0.94), rgba(12, 14, 16, 0.98)), url(${collegeBg})`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed", color: "#e2e2e4", display: "flex", flexDirection: { xs: "column", md: "row" } }}>
      
      {/* SIDEBAR PANEL NAVIGATION */}
      <Box sx={{ width: { xs: "100%", md: 280 }, bgcolor: "rgba(25, 28, 29, 0.85)", backdropFilter: "blur(20px)", borderRight: { xs: "none", md: "1px solid rgba(255, 255, 255, 0.08)" }, borderBottom: { xs: "1px solid rgba(255, 255, 255, 0.08)", md: "none" }, display: "flex", flexDirection: "column", p: 3, maxHeight: { md: "100vh" }, overflowY: "auto" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3, mt: 1 }}>
          <Avatar sx={{ bgcolor: "#818cf8", color: "#1e1b4b", fontWeight: 700, width: 44, height: 44 }}>D</Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={800} noWrap>{profile?.name || "Dean of Student Affairs"}</Typography>
            <Typography variant="caption" sx={{ color: "#c6c5d7", opacity: 0.8, wordBreak: "break-all" }}>{user?.email}</Typography>
          </Box>
        </Box>

        <Divider sx={{ borderColor: "rgba(255,255,255,0.08)", mb: 2 }} />
        
        <List sx={{ p: 0 }}>
          {[
            { id: "overview", text: "Pending Approvals", icon: <AssignmentTurnedInIcon /> },
            { id: "clubs", text: "Clubs Directory Control", icon: <GroupsIcon /> },
            { id: "broadcasts", text: "Global Broadcasts", icon: <CampaignIcon /> },
            { id: "manual", text: "Direct Allocation Control", icon: <PersonAddIcon /> }
          ].map((item) => (
            <ListItem button key={item.id} onClick={() => { setActiveTab(item.id); setError(""); setSuccess(""); }} sx={{ borderRadius: 2, mb: 0.5, bgcolor: activeTab === item.id ? "rgba(192, 193, 255, 0.12)" : "transparent", color: activeTab === item.id ? "#c0c1ff" : "#e2e2e4", cursor: "pointer", "&:hover": { bgcolor: "rgba(255,255,255,0.05)" } }}>
              <Box sx={{ mr: 1.5, display: "flex", color: activeTab === item.id ? "#c0c1ff" : "inherit" }}>{item.icon}</Box>
              <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: "0.88rem", fontWeight: 600 }} />
            </ListItem>
          ))}
        </List>

        <Box sx={{ flexGrow: 1 }} />
        <Divider sx={{ borderColor: "rgba(255,255,255,0.08)", mb: 2 }} />
        <Button variant="text" startIcon={<LogoutIcon />} onClick={signOut} sx={{ color: "#ffb0ce", justifyContent: "flex-start", textTransform: "none", fontWeight: 600 }}>Sign Out Workspace</Button>
      </Box>

      {/* MAIN WORKSPACE PANEL DISPLAY */}
      <Box sx={{ flexGrow: 1, p: { xs: 2, sm: 4, md: 5 }, overflowY: "auto", maxHeight: "100vh" }}>
        
        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>{success}</Alert>}

        {/* TAB PATHWAY 1: PENDING VERIFICATION PIPELINES */}
        {activeTab === "overview" && (
          <Box>
            <Typography variant="h4" fontWeight={800} gutterBottom sx={{ color: "white" }}>Claims Authorization Panel</Typography>
            <Typography variant="body2" sx={{ color: "#c6c5d7", opacity: 0.8, mb: 4 }}>Review student activity claims endorsed by designated Faculty Coordinators campus-wide.</Typography>
            
            <Card sx={{ bgcolor: "rgba(30, 32, 33, 0.5)", backdropFilter: "blur(20px)", borderRadius: 4, border: "1px solid rgba(255, 255, 255, 0.1)", color: "white" }}>
              <CardContent sx={{ p: 4 }}>
                {incomingRequests.length === 0 ? (
                  <Alert severity="info" sx={{ bgcolor: "rgba(0,0,0,0.2)", color: "#cbd5e1" }}>No student operational claims require final validation at this juncture.</Alert>
                ) : (
                  <Stack spacing={2}>
                    {incomingRequests.map((req) => (
                      <Card key={req.id} variant="outlined" onClick={() => { setSelectedRequest(req); setOpenRequestDetails(true); }} sx={{ cursor: "pointer", bgcolor: "rgba(255,255,255,0.01)", borderColor: "rgba(255,255,255,0.06)", color: "white", "&:hover": { bgcolor: "rgba(255,255,255,0.04)" } }}>
                        <CardContent sx={{ p: 2.5 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box>
                              <Typography variant="body1" fontWeight={700} color="#ffb0ce">{req.eventName}</Typography>
                              <Typography variant="caption" sx={{ display: "block", color: "#9ca3af", mt: 0.5 }}>Origin Unit: {req.clubName} | Type: {req.requestType.toUpperCase()} • {req.participants?.length || 0} cadets listed</Typography>
                            </Box>
                            <Button variant="contained" color="secondary" size="small" sx={{ textTransform: "none", fontWeight: 700 }}>Review & Authorize</Button>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Box>
        )}

        {/* TAB PATHWAY 2: LIVE CLUBS REGISTRIES & MANAGEMENT CHANNELS */}
        {activeTab === "clubs" && (
          <Box>
            <Typography variant="h4" fontWeight={800} gutterBottom sx={{ color: "white" }}>Institutional Clubs Directory Control</Typography>
            <Typography variant="body2" sx={{ color: "#c6c5d7", opacity: 0.8, mb: 4 }}>Initialize new student portfolios or dissolve inactive campus organizations instantly.</Typography>

            <Grid container spacing={3.5}>
              {/* Left Column: Create New Portfolio */}
              <Grid item xs={12} lg={4}>
                <Card sx={{ bgcolor: "rgba(30, 32, 33, 0.5)", backdropFilter: "blur(20px)", borderRadius: 4, border: "1px solid rgba(255, 255, 255, 0.1)", color: "white" }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight={700} color="primary.main" sx={{ mb: 2 }}>Initialize New Club</Typography>
                    <Box component="form" onSubmit={handleCreateClub}>
                      <TextField fullWidth size="small" label="Club Unique Token ID (e.g., DEB_SOC)" value={newClubId} onChange={(e)=>setNewClubId(e.target.value)} sx={{ mb: 2 }} />
                      <TextField fullWidth size="small" label="Official Club Name String" value={newClubName} onChange={(e)=>setNewClubName(e.target.value)} sx={{ mb: 2 }} />
                      <TextField fullWidth size="small" label="President Student USN" value={newClubPres} onChange={(e)=>setNewClubPres(e.target.value)} sx={{ mb: 2 }} />
                      <TextField fullWidth size="small" label="Faculty Coordinator SAP ID" value={newClubCoord} onChange={(e)=>setNewClubCoord(e.target.value)} sx={{ mb: 2.5 }} />
                      <Button type="submit" variant="contained" color="primary" fullWidth startIcon={<PersonAddIcon />}>Provision Club Unit</Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Right Column: Master Viewer Ledger */}
              <Grid item xs={12} lg={8}>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  {allClubs.map((club) => (
                    <Grid item xs={12} sm={6} key={club.id}>
                      <Card onClick={() => setSelectedClub(club)} sx={{ cursor: "pointer", bgcolor: selectedClub?.id === club.id ? "rgba(192,193,255,0.1)" : "rgba(25,28,29,0.4)", border: selectedClub?.id === club.id ? "1px solid #c0c1ff" : "1px solid rgba(255,255,255,0.05)", color: "white" }}>
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="body1" fontWeight={700}>{club.clubName}</Typography>
                          <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>Identifier Key: {club.clubId}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                {selectedClub && (
                  <Card sx={{ bgcolor: "rgba(30, 32, 33, 0.5)", backdropFilter: "blur(20px)", borderRadius: 4, border: "1px solid rgba(255, 255, 255, 0.1)", color: "white", p: 2 }}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                        <Box>
                          <Typography variant="h5" fontWeight={800} color="#ffb0ce">{selectedClub.clubName}</Typography>
                          <Typography variant="body2" sx={{ color: "#cbd5e1", mt: 0.5 }}>Leader (President): <strong>{selectedClub.presidentUsn}</strong></Typography>
                          <Typography variant="body2" sx={{ color: "#cbd5e1" }}>Faculty Coordinator SAP ID: <strong>{selectedClub.coordinatorSapId}</strong></Typography>
                        </Box>
                        <Button variant="outlined" color="error" startIcon={<DeleteForeverIcon />} onClick={() => handleDissolveClub(selectedClub.id)} sx={{ textTransform: "none", fontSize: "0.8rem" }}>Dissolve Unit</Button>
                      </Stack>

                      {/* MAILTO HYPERLINK ACTION BUTTON MIGRATION BLOCK */}
                      <Button variant="contained" size="small" color="info" startIcon={<MailOutlineIcon />} href={`mailto:${selectedClub.coordinatorSapId.includes('@') ? selectedClub.coordinatorSapId : `${selectedClub.coordinatorSapId}@rvce.edu.in`}`} sx={{ mb: 3, textTransform: "none", borderRadius: 2 }}>
                        Contact Faculty Coordinator via Mail
                      </Button>

                      <Divider sx={{ borderColor: "rgba(255,255,255,0.08)", my: 2 }} />
                      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: "#c0c1ff" }}>Active Bulletin Broadcasts Posted:</Typography>
                      <Stack spacing={1} sx={{ maxHeight: 150, overflowY: "auto", mb: 3 }}>
                        {(selectedClub.announcements || []).map((ann, idx) => (
                          <Paper key={idx} variant="outlined" sx={{ p: 1.5, bgcolor: "rgba(0,0,0,0.15)", color: "white" }}>
                            <Typography variant="body2" fontWeight={700}>{ann.title}</Typography>
                            <Typography variant="caption" sx={{ whiteSpace: "pre-wrap", opacity: 0.8 }}>{ann.content}</Typography>
                          </Paper>
                        ))}
                      </Stack>

                      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: "#c0c1ff" }}>Bound Membership Ledger Roster ({Object.keys(selectedClub.members || {}).length} links):</Typography>
                      <TableContainer component={Paper} sx={{ bgcolor: "rgba(0,0,0,0.15)", maxHeight: 180 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow sx={{ "& th": { bgcolor: "#1e293b", color: "white" } }}>
                              <TableCell>Identifier USN</TableCell>
                              <TableCell>Designated Rank</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {Object.keys(selectedClub.members || {}).map((key) => (
                              <TableRow key={key} sx={{ "& td": { color: "#cbd5e1" } }}>
                                <TableCell>{key}</TableCell>
                                <TableCell>{selectedClub.members[key].role}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                )}
              </Grid>
            </Grid>
          </Box>
        )}

        {/* TAB PATHWAY 3: CAMPUS-WIDE BROADCAST DISPATCH BOARD */}
        {activeTab === "broadcasts" && (
          <Box>
            <Typography variant="h4" fontWeight={800} gutterBottom sx={{ color: "white" }}>Global Student Communication Bulletin</Typography>
            <Typography variant="body2" sx={{ color: "#c6c5d7", opacity: 0.8, mb: 4 }}>Publish high-priority updates that render directly across all student terminal accounts instantly.</Typography>

            <Card sx={{ maxWidth: 650, bgcolor: "rgba(30, 32, 33, 0.5)", backdropFilter: "blur(20px)", borderRadius: 4, border: "1px solid rgba(255, 255, 255, 0.1)", color: "white" }}>
              <CardContent sx={{ p: 4 }}>
                <Box component="form" onSubmit={handlePublishBroadcast}>
                  <TextField fullWidth label="Broadcast Header Title Text" value={globalAnnTitle} onChange={(e)=>setGlobalAnnTitle(e.target.value)} sx={{ mb: 2 }} />
                  <TextField fullWidth multiline rows={4} label="Detailed Announcement Body Content (Supports Newlines)" value={globalAnnContent} onChange={(e)=>setGlobalAnnContent(e.target.value)} sx={{ mb: 3 }} />
                  <Box textAlign="right"><Button type="submit" variant="contained" color="secondary" startIcon={<CampaignIcon />} disabled={!globalAnnTitle.trim() || !globalAnnContent.trim()}>Publish Campus-Wide Broadcast</Button></Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* TAB PATHWAY 4: MANUAL COMPENSATIONS DISPATCH */}
        {activeTab === "manual" && (
          <Box>
            <Typography variant="h4" fontWeight={800} gutterBottom sx={{ color: "white" }}>Direct Individual Credit Adjustment Control</Typography>
            <Typography variant="body2" sx={{ color: "#c6c5d7", opacity: 0.8, mb: 4 }}>Bypass standard workflow lines to issue activity points or attendance credits directly to an individual student record.</Typography>

            <Card sx={{ maxWidth: 650, bgcolor: "rgba(30, 32, 33, 0.5)", backdropFilter: "blur(20px)", borderRadius: 4, border: "1px solid rgba(255, 255, 255, 0.1)", color: "white" }}>
              <CardContent sx={{ p: 4 }}>
                <Box component="form" onSubmit={handleIssueIndividualToken}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Target Student USN" value={indivUsn} onChange={(e)=>setIndivUsn(e.target.value)} /></Grid>
                    <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Student Full Name Reference" value={indivName} onChange={(e)=>setIndivName(e.target.value)} /></Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField select fullWidth size="small" label="Credit Category" value={indivType} onChange={(e)=>setIndivType(e.target.value)}>
                        <MenuItem value="points">AICTE Activity Points Allocation</MenuItem>
                        <MenuItem value="attendance">Institutional Attendance Sync Token</MenuItem>
                        <MenuItem value="both">Bilateral Credit Distribution (Both)</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6}><TextField fullWidth size="small" type="number" label="Credit Point Weight Value" disabled={indivType==="attendance"} value={indivValue} onChange={(e)=>setIndivValue(e.target.value)} /></Grid>
                    <Grid item xs={12}><TextField fullWidth multiline rows={2} label="Official Allocation Reason / Event Reference Description" value={indivReason} onChange={(e)=>setIndivReason(e.target.value)} sx={{ mb: 2 }} /></Grid>
                  </Grid>
                  <Box textAlign="right"><Button type="submit" variant="contained" color="primary" startIcon={<PersonAddIcon />}>Issue Direct Credit Clearance</Button></Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

      </Box>

      {/* VERIFICATION DIALOG CONSOLE ACTION CORES */}
      {selectedRequest && (
        <ClubRequestDetailDialog 
          open={openRequestDetails} 
          onClose={() => { setOpenRequestDetails(false); setSelectedRequest(null); }} 
          request={selectedRequest} 
          isFaculty={true} 
          isDeanView={true} 
        />
      )}
    </Box>
  );
};

export default DeanDashboard;