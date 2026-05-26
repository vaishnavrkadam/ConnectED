import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  TextField,
  Button,
  MenuItem,
  Divider,
  Alert,
  CircularProgress,
  Grid,
  IconButton,
  List,
  Paper,
  Chip
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CampaignIcon from "@mui/icons-material/Campaign";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { db } from "../firebase";
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc } from "firebase/firestore";
import ClubRequestDetailDialog from "./ClubRequestDetailDialog";
const ClubOperationsPortal = ({ studentUsn, studentName, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [myClubs, setMyClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState(null);
  const [clubRequests, setClubRequests] = useState([]);
  const [isPresident, setIsPresident] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [openRequestDetails, setOpenRequestDetails] = useState(false);

  // Claim Request Form Fields
  const [eventName, setEventName] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [requestType, setRequestType] = useState("points");
  const [bulkPoints, setBulkPoints] = useState("");
  const [proofBase64, setProofBase64] = useState("");
  const [participants, setParticipants] = useState([{ usn: "", name: "", points: "" }]);

  // Announcement Form Fields
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annImageBase64, setAnnImageBase64] = useState("");

  // 1. Dynamic Membership Scan Listener
  useEffect(() => {
    const clubsRef = collection(db, "clubs");
    const unsubscribe = onSnapshot(clubsRef, (snapshot) => {
      const managedPool = [];
      snapshot.forEach((docData) => {
        const data = docData.data();
        if (data.members && data.members[studentUsn]) {
          managedPool.push({ id: docData.id, ...data });
        }
      });
      setMyClubs(managedPool);
      setLoading(false);
      
      if (managedPool.length > 0 && !selectedClub) {
        handleSelectClub(managedPool[0]);
      }
    });
    return () => unsubscribe();
  }, [studentUsn]);

  // 2. Active Verification Track Listener
  useEffect(() => {
    if (!selectedClub) return;
    const q = query(collection(db, "club_requests"), where("clubId", "==", selectedClub.clubId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const buffer = [];
      snapshot.forEach((d) => buffer.push({ id: d.id, ...d.data() }));
      setClubRequests(buffer.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
    });
    return () => unsubscribe();
  }, [selectedClub]);

  const handleSelectClub = (club) => {
    setSelectedClub(club);
    setIsPresident(club.presidentUsn === studentUsn);
    setError("");
    setSuccess("");
    setParticipants([{ usn: studentUsn, name: studentName, points: "" }]);
  };

  // Free Base64 Encoder Reader Helper
  const handleFileConversion = (e, target) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (target === "proof") setProofBase64(reader.result);
      if (target === "announcement") setAnnImageBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const addParticipantRow = () => {
    setParticipants([...participants, { usn: "", name: "", points: "" }]);
  };

  const removeParticipantRow = (index) => {
    const list = [...participants];
    list.splice(index, 1);
    setParticipants(list);
  };

  const updateParticipantField = (index, field, value) => {
    const list = [...participants];
    list[index][field] = value;
    setParticipants(list);
  };

  const applyBulkPointsValue = (val) => {
    setBulkPoints(val);
    setParticipants(participants.map(p => ({ ...p, points: val })));
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!eventName.trim() || !fromDate || !toDate) {
      setError("Please satisfy all mandatory header core fields.");
      return;
    }

    try {
      await addDoc(collection(db, "club_requests"), {
        clubId: selectedClub.clubId,
        clubName: selectedClub.clubName,
        eventName: eventName.trim(),
        fromDate,
        toDate,
        requestType,
        proofUrl: proofBase64,
        participants: participants.filter(p => p.usn.trim() !== ""),
        status: "pending_coordinator",
        coordinatorSapId: selectedClub.coordinatorSapId,
        coordinatorApproval: { status: "pending", updatedAt: null },
        deanApproval: { status: "pending", updatedAt: null },
        createdAt: new Date().toISOString()
      });

      setSuccess("Operational verification request successfully posted to Faculty Coordinator!");
      setEventName("");
      setFromDate("");
      setToDate("");
      setProofBase64("");
      setParticipants([{ usn: studentUsn, name: studentName, points: "" }]);
    } catch (err) {
      setError("Failed to dispatch club verification token write.");
    }
  };

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;

    try {
      const updatedAnnouncements = [
        {
          announcementId: "ann_" + Date.now(),
          title: annTitle.trim(),
          content: annContent.trim(),
          imageUrl: annImageBase64,
          createdAt: new Date().toISOString()
        },
        ...(selectedClub.announcements || [])
      ];

      await updateDoc(doc(db, "clubs", selectedClub.id), { announcements: updatedAnnouncements });
      setSuccess("Announcement broadcast successfully pinned!");
      setAnnTitle("");
      setAnnContent("");
      setAnnImageBase64("");
    } catch (err) {
      setError("Failed to publish announcement matrix.");
    }
  };

  if (loading) return <Box textAlign="center" py={5}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
        <IconButton onClick={onBack} sx={{ color: "white", bgcolor: "rgba(255,255,255,0.05)" }}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h5" fontWeight={700}>Club Operations Interface</Typography>
          <Typography variant="caption" sx={{ color: "#c6c5d7", opacity: 0.6 }}>Verified administrative console workspace</Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>{success}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} lg={selectedClub ? 4 : 12}>
          <Stack spacing={2}>
            <Typography variant="subtitle2" fontWeight={700}>My Registered Affiliated Clubs</Typography>
            {myClubs.map((club) => {
              const isSelected = selectedClub?.id === club.id;
              return (
                <Card key={club.id} onClick={() => handleSelectClub(club)} sx={{ cursor: "pointer", bgcolor: isSelected ? "rgba(192, 193, 255, 0.1)" : "rgba(25, 28, 29, 0.5)", border: isSelected ? "1px solid #c0c1ff" : "1px solid rgba(255,255,255,0.05)", color: "white" }}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="body1" fontWeight={700}>{club.clubName}</Typography>
                    <Typography variant="caption" sx={{ color: "#c6c5d7", display: "block", mt: 0.5 }}>Role: {club.members[studentUsn]?.role || "Cadet"}</Typography>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        </Grid>

        {selectedClub && (
          <Grid item xs={12} lg={8}>
            <Stack spacing={4}>
              <Card sx={{ bgcolor: "rgba(30, 32, 33, 0.4)", color: "white", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} color="secondary" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}><CampaignIcon /> Announcement Bulletin Board</Typography>
                  {isPresident && (
                    <Box component="form" onSubmit={handlePostAnnouncement} sx={{ mb: 3, p: 2, bgcolor: "rgba(0,0,0,0.15)", borderRadius: 2 }}>
                      <TextField fullWidth size="small" label="Heading Title" value={annTitle} onChange={(e)=>setAnnTitle(e.target.value)} sx={{ mb: 1.5 }} />
                      <TextField fullWidth multiline rows={2} label="Announcement Details Content" value={annContent} onChange={(e)=>setAnnContent(e.target.value)} sx={{ mb: 1.5 }} />
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Button variant="outlined" component="label" size="small" startIcon={<CloudUploadIcon />} color="info">Upload Image<input type="file" hidden accept="image/*" onChange={(e) => handleFileConversion(e, "announcement")} /></Button>
                        {annImageBase64 && <Chip label="Graphic Loaded" color="success" size="small" onDelete={()=>setAnnImageBase64("")} />}
                      </Stack>
                      <Box textAlign="right" sx={{ mt: 1.5 }}><Button type="submit" variant="contained" color="secondary" size="small" disabled={!annTitle.trim() || !annContent.trim()}>Pin Announcement</Button></Box>
                    </Box>
                  )}
                  <Stack spacing={1.5} sx={{ maxHeight: 220, overflowY: "auto" }}>
                    {(selectedClub.announcements || []).map((ann, i) => (
                      <Paper key={i} variant="outlined" sx={{ p: 2, bgcolor: "rgba(255,255,255,0.02)", color: "white", borderColor: "rgba(255,255,255,0.05)" }}>
                        <Typography variant="body1" fontWeight={700} color="#c0c1ff">{ann.title}</Typography>
                        <Typography variant="body2" sx={{ opacity: 0.8, my: 1 }}>{ann.content}</Typography>
                        {ann.imageUrl && <Box component="img" src={ann.imageUrl} sx={{ maxWidth: "100%", maxHeight: 140, borderRadius: 2, mt: 1 }} />}
                      </Paper>
                    ))}
                  </Stack>
                </CardContent>
              </Card>

              <Card sx={{ bgcolor: "rgba(30, 32, 33, 0.4)", color: "white", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} color="primary" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}><AssignmentTurnedInIcon /> Activity Points & Attendance Claims</Typography>
                  {isPresident && (
                    <Box component="form" onSubmit={handleCreateRequest} sx={{ p: 2, bgcolor: "rgba(0,0,0,0.15)", borderRadius: 2, mb: 3 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Event Name" value={eventName} onChange={(e)=>setEventName(e.target.value)} /></Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField select fullWidth size="small" label="Claim Category" value={requestType} onChange={(e)=>{setRequestType(e.target.value); if(e.target.value==="attendance") applyBulkPointsValue(""); }}>
                            <MenuItem value="points">Activity Points Matrix Only</MenuItem>
                            <MenuItem value="attendance">Institutional Attendance Sync Only</MenuItem>
                            <MenuItem value="both">Bilateral Claims (Both)</MenuItem>
                          </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6}><TextField fullWidth type="date" label="From" InputLabelProps={{ shrink: true }} value={fromDate} onChange={(e)=>setFromDate(e.target.value)} /></Grid>
                        <Grid item xs={12} sm={6}><TextField fullWidth type="date" label="To" InputLabelProps={{ shrink: true }} value={toDate} onChange={(e)=>setToDate(e.target.value)} /></Grid>
                      </Grid>
                      {requestType !== "attendance" && <TextField size="small" label="Assign Bulk Points Value to All Rows" type="number" value={bulkPoints} onChange={(e)=>applyBulkPointsValue(e.target.value)} sx={{ mt: 2, width: "100%" }} />}
                      <Divider sx={{ my: 2, borderColor: "rgba(255,255,255,0.08)" }} />
                      {participants.map((p, idx) => (
                        <Stack key={idx} direction="row" spacing={1.5} sx={{ mb: 1 }}>
                          <TextField size="small" label="USN" value={p.usn} onChange={(e)=>updateParticipantField(idx, "usn", e.target.value.toUpperCase())} required sx={{ flex: 2 }} />
                          <TextField size="small" label="Full Name" value={p.name} onChange={(e)=>updateParticipantField(idx, "name", e.target.value)} required sx={{ flex: 3 }} />
                          <TextField size="small" label="Points" type="number" disabled={requestType==="attendance"} value={p.points} onChange={(e)=>updateParticipantField(idx, "points", e.target.value)} sx={{ flex: 1.5 }} />
                          {participants.length > 1 && <IconButton color="error" onClick={()=>removeParticipantRow(idx)}><DeleteIcon /></IconButton>}
                        </Stack>
                      ))}
                      <Button startIcon={<AddIcon />} size="small" onClick={addParticipantRow} sx={{ mt: 1, textTransform: "none" }}>Add Cadet Row Entry</Button>
                      <Stack direction="row" sx={{ mt: 2 }} spacing={2}>
                        <Button variant="outlined" component="label" size="small" startIcon={<CloudUploadIcon />}>Upload Claims Proof Document<input type="file" hidden onChange={(e) => handleFileConversion(e, "proof")} /></Button>
                        {proofBase64 && <Chip label="Proof Document Active" color="success" size="small" onDelete={()=>setProofBase64("")} />}
                      </Stack>
                      <Box textAlign="right" sx={{ mt: 2 }}><Button type="submit" variant="contained" color="primary">Submit Operational Verification Request</Button></Box>
                    </Box>
                  )}
                  <Stack spacing={1.5} sx={{ maxHeight: 300, overflowY: "auto" }}>
                    {clubRequests.map((req) => (
                      <Paper 
                         key={req.id} 
                         variant="outlined" 
                         onClick={() => {
                           setSelectedRequest(req);
                           setOpenRequestDetails(true);
                         }}
                         sx={{ 
                            p: 2, 
                            bgcolor: "rgba(0,0,0,0.2)", 
                            borderColor: "rgba(255,255,255,0.06)", 
                            color: "white", 
                            cursor: "pointer", // Gives pointer feedback on hover
                            "&:hover": { bgcolor: "rgba(255,255,255,0.04)" }
                         }}
                      >
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body1" fontWeight={700} color="#ffb0ce">{req.eventName}</Typography>
                          <Chip label={req.status.replace("_", " ").toUpperCase()} size="small" color={req.status==="approved"?"success":(req.status==="rejected"?"error":"info")} />
                        </Stack>
                        <Typography variant="caption" sx={{ display: "block", color: "rgba(255,255,255,0.4)", mt: 0.5 }}>Frame Window: {req.fromDate} to {req.toDate} | Category: {req.requestType.toUpperCase()}</Typography>
                      </Paper>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        )}
      </Grid>
      <ClubRequestDetailDialog
        open={openRequestDetails}
        onClose={() => setOpenRequestDetails(false)}
        request={selectedRequest}
        isFaculty={false}
      />
    </Box>
  );
};

export default ClubOperationsPortal;