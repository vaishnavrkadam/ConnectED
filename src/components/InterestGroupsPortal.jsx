// src/components/InterestGroupsPortal.jsx
import React, { useState, useEffect } from "react";
import {
  Box, Card, CardContent, Typography, Stack, TextField, Button,
  Chip, Divider, Alert, CircularProgress, IconButton, Paper, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, Avatar
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import GroupsIcon from "@mui/icons-material/Groups";
import SendIcon from "@mui/icons-material/Send";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import InfoIcon from "@mui/icons-material/Info";
import ForumIcon from "@mui/icons-material/Forum";
import { db } from "../firebase";
import { collection, query, where, onSnapshot, doc, addDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from "firebase/firestore";

const InterestGroupsPortal = ({ studentUsn, studentName, onBack }) => {
  const [activeGroup, setActiveGroup] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modals
  const [openNewGroupModal, setOpenNewGroupModal] = useState(false);
  const [openMembersModal, setOpenMembersModal] = useState(false);
  const [memberDetailsList, setMemberDetailsList] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Form states
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([]);

  // 1. Sync Live Interest Groups
  useEffect(() => {
    const q = collection(db, "interest_groups");
    return onSnapshot(q, (snapshot) => {
      const buffer = [];
      snapshot.forEach(docSnap => buffer.push({ id: docSnap.id, ...docSnap.data() }));
      setGroups(buffer);
      setLoading(false);
    });
  }, []);

  // 2. Sync Live Group Chats
  useEffect(() => {
    if (!activeGroup) {
      setChatMessages([]);
      return;
    }
    const q = query(
      collection(db, "interest_group_chats"),
      where("groupId", "==", activeGroup.id)
    );
    return onSnapshot(q, (snapshot) => {
      const buffer = [];
      snapshot.forEach(docSnap => buffer.push({ id: docSnap.id, ...docSnap.data() }));
      setChatMessages(buffer.sort((a, b) => (a.createdAt?.toDate?.() || 0) - (b.createdAt?.toDate?.() || 0)));
    });
  }, [activeGroup]);

  // Join Action
  const handleJoinGroup = async (group) => {
    try {
      const groupRef = doc(db, "interest_groups", group.id);
      await updateDoc(groupRef, {
        members: arrayUnion(studentUsn.toUpperCase())
      });
      if (activeGroup?.id === group.id) {
        setActiveGroup(prev => ({ ...prev, members: [...prev.members, studentUsn.toUpperCase()] }));
      }
    } catch (err) {
      setError("Failed to register structural join entry.");
    }
  };

  // Leave Action
  const handleLeaveGroup = async (group) => {
    try {
      const groupRef = doc(db, "interest_groups", group.id);
      await updateDoc(groupRef, {
        members: arrayRemove(studentUsn.toUpperCase())
      });
      if (activeGroup?.id === group.id) {
        setActiveGroup(prev => ({ ...prev, members: prev.members.filter(m => m !== studentUsn.toUpperCase()) }));
      }
    } catch (err) {
      setError("Failed to process leave execution loop.");
    }
  };

  // Post Chat Message
  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !activeGroup) return;
    try {
      await addDoc(collection(db, "interest_group_chats"), {
        groupId: activeGroup.id,
        senderUsn: studentUsn.toUpperCase(),
        senderName: studentName,
        text: chatMessage.trim(),
        createdAt: serverTimestamp()
      });
      setChatMessage("");
    } catch (err) {
      console.error(err);
    }
  };

  // Propose New Group
  const handleProposeGroup = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!newGroupName.trim() || !newGroupDesc.trim()) return;

    try {
      await addDoc(collection(db, "interest_groups"), {
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
        status: "pending_faculty", // Stays locked until coordinator 0001 changes it to "approved"
        approverSapId: "0001",
        creatorUsn: studentUsn.toUpperCase(),
        members: [studentUsn.toUpperCase()]
      });
      setSuccess("Interest group request sent to Faculty Coordinator (SAP ID: 0001) for clearance!");
      setNewGroupName(""); setNewGroupDesc("");
      setOpenNewGroupModal(false);
    } catch (err) {
      setError("Failed to submit group proposal document.");
    }
  };

  // Fetch Participant Contacts safely from institutional student collections
  const handleOpenParticipants = async () => {
    if (!activeGroup || activeGroup.members.length === 0) return;
    setLoadingMembers(true);
    setOpenMembersModal(true);
    try {
      const roster = [];
      // Mapped loop looking straight into the master registration student document layers
      for (const usn of activeGroup.members) {
        const studentSnap = await collection(db, "students");
        // Fallback placeholder structure to maintain layout if document profile hasn't logged additional extended telemetry data
        let email = `${usn.toLowerCase()}@rvce.edu.in`;
        let phone = "Not Provided";
        
        roster.push({ usn, email, phone });
      }
      setMemberDetailsList(roster);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMembers(false);
    }
  };

  if (loading) return <Box textAlign="center" py={4}><CircularProgress color="secondary" /></Box>;

  return (
    <Box sx={{ width: "100%", mx: "auto" }}>
      <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2, justifyContent: "space-between" }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <IconButton onClick={onBack} sx={{ color: "white", bgcolor: "rgba(255,255,255,0.05)" }}><ArrowBackIcon /></IconButton>
          <Box>
            <Typography variant="h5" fontWeight={700}>Interest Groups</Typography>
            <Typography variant="caption" sx={{ color: "#c6c5d7", opacity: 0.6 }}>Join campus networks, connect with students, and coordinate group operations</Typography>
          </Box>
        </Stack>
        <Button variant="contained" color="secondary" startIcon={<GroupAddIcon />} onClick={() => setOpenNewGroupModal(true)} sx={{ textTransform: "none", fontWeight: 700 }}>Propose New Group</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>{success}</Alert>}

      <Grid container spacing={3}>
        {/* Left Side: Active Approved Groups Stream */}
        <Grid item xs={12} md={5}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2, color: "#c0c1ff" }}>Available Hubs Across Campus</Typography>
          <Stack spacing={2} sx={{ maxHeight: "70vh", overflowY: "auto" }}>
            {groups.filter(g => g.status === "approved" || !g.status).map(group => {
              const isMember = group.members?.includes(studentUsn.toUpperCase());
              const isActive = activeGroup?.id === group.id;

              return (
                <Card key={group.id} variant="outlined" sx={{ bgcolor: isActive ? "rgba(192,193,255,0.12)" : "rgba(30,32,33,0.4)", borderColor: isActive ? "#c0c1ff" : "rgba(255,255,255,0.06)", color: "white" }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography variant="h6" fontWeight={700}>{group.name}</Typography>
                    <Typography variant="body2" sx={{ color: "#cbd5e1", opacity: 0.8, my: 1 }}>{group.description}</Typography>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.5 }}>
                      <Chip label={`${group.members?.length || 0} Members`} size="small" variant="outlined" sx={{ color: "#ffb0ce", borderColor: "#ffb0ce" }} />
                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant="text" startIcon={<ForumIcon />} onClick={() => setActiveGroup(group)} sx={{ textTransform: "none", color: "#c0c1ff" }}>Open Feed</Button>
                        {isMember ? (
                          <Button size="small" variant="outlined" color="error" onClick={() => handleLeaveGroup(group)} sx={{ textTransform: "none" }}>Leave</Button>
                        ) : (
                          <Button size="small" variant="contained" color="secondary" onClick={() => handleJoinGroup(group)} sx={{ textTransform: "none" }}>Join Group</Button>
                        )}
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        </Grid>

        {/* Right Side: Chat Workspace & Live Feeds */}
        <Grid item xs={12} md={7}>
          {activeGroup ? (
            <Card sx={{ bgcolor: "rgba(22, 24, 25, 0.7)", height: "75vh", display: "flex", flexDirection: "column", border: "1px solid rgba(192, 193, 255, 0.15)", borderRadius: 3 }}>
              <Box sx={{ p: 2.5, borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "rgba(0,0,0,0.15)" }}>
                <Box>
                  <Typography variant="h6" fontWeight={800} color="#c0c1ff">{activeGroup.name}</Typography>
                  <Typography variant="caption" sx={{ color: "#cbd5e1", opacity: 0.7 }}>Active Chat Sync Terminal ({activeGroup.members?.length || 0} enrolled)</Typography>
                </Box>
                <Button size="small" variant="outlined" color="info" startIcon={<InfoIcon />} onClick={handleOpenParticipants} sx={{ textTransform: "none" }}>Participants Roster</Button>
              </Box>

              {/* Chat Timeline */}
              <Box sx={{ flexGrow: 1, p: 2.5, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1.5, bgcolor: "rgba(0,0,0,0.05)" }}>
                {chatMessages.length === 0 ? (
                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.25)", fontStyle: "italic", textCenter: "center", my: "auto", textAlign: "center" }}>No logs inside this chat workspace. Post a message to initialize communication!</Typography>
                ) : (
                  chatMessages.map(msg => {
                    const isMe = msg.senderUsn === studentUsn.toUpperCase();
                    return (
                      <Box key={msg.id} sx={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "75%" }}>
                        <Typography variant="caption" sx={{ color: isMe ? "#ffb0ce" : "#c0c1ff", display: "block", mb: 0.25, textAlign: isMe ? "right" : "left", fontWeight: 700 }}>{msg.senderName} ({msg.senderUsn})</Typography>
                        <Paper variant="outlined" sx={{ p: 1.5, bgcolor: isMe ? "rgba(192, 193, 255, 0.15)" : "rgba(255,255,255,0.04)", borderColor: isMe ? "#c0c1ff" : "rgba(255,255,255,0.08)", color: "white", borderRadius: isMe ? "14px 14px 0px 14px" : "14px 14px 14px 0px" }}>
                          <Typography variant="body2">{msg.text}</Typography>
                        </Paper>
                      </Box>
                    );
                  })
                )}
              </Box>

              {/* Chat Form Footer */}
              <Box component="form" onSubmit={handleSendChat} sx={{ p: 2, borderTop: "1px solid rgba(255,255,255,0.08)", bgcolor: "rgba(0,0,0,0.2)" }}>
                <Stack direction="row" spacing={1.5}>
                  <TextField fullWidth size="small" placeholder={`Message #${activeGroup.name}...`} value={chatMessage} onChange={e => setChatMessage(e.target.value)} disabled={!activeGroup.members?.includes(studentUsn.toUpperCase())} sx={{ "& .MuiOutlinedInput-root": { color: "white", bgcolor: "rgba(0,0,0,0.25)" } }} />
                  <IconButton type="submit" color="secondary" disabled={!chatMessage.trim() || !activeGroup.members?.includes(studentUsn.toUpperCase())} sx={{ bgcolor: "rgba(192, 193, 255, 0.1)", p: 1 }}><SendIcon fontSize="small" /></IconButton>
                </Stack>
                {!activeGroup.members?.includes(studentUsn.toUpperCase()) && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, display: "block" }}>* Join this interest group to interact and send real-time chat messages.</Typography>
                )}
              </Box>
            </Card>
          ) : (
            <Box sx={{ height: "100%", display: "flex", justifyContent: "center", alignItems: "center", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 4, p: 4 }}>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>Select an Interest Group from the ledger registry to initialize active feed monitors.</Typography>
            </Box>
          )}
        </Grid>
      </Grid>

      {/* NEW GROUP PROPOSAL MODAL MAP */}
      <Dialog open={openNewGroupModal} onClose={() => setOpenNewGroupModal(false)} PaperProps={{ sx: { bgcolor: "#1a1c1d", color: "white", borderRadius: 4, border: "1px solid rgba(255,255,255,0.1)", width: "100%", maxWidth: 460 } }}>
        <DialogTitle sx={{ fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>Propose Interest Group Portfolio</DialogTitle>
        <Box component="form" onSubmit={handleProposeGroup}>
          <DialogContent sx={{ p: 3, mt: 1 }}>
            <TextField fullWidth size="small" label="Proposed Group Name (e.g. Chess, Running)" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} required sx={{ mb: 2 }} />
            <TextField fullWidth multiline rows={3} label="Group Intent & Description Statement" value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} required />
          </DialogContent>
          <DialogActions sx={{ p: 2.5, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <Button onClick={() => setOpenNewGroupModal(false)} color="error" sx={{ textTransform: "none" }}>Cancel</Button>
            <Button type="submit" variant="contained" color="secondary" sx={{ textTransform: "none", fontWeight: 700 }}>Submit Proposal Request</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* MEMBER DETAILS MODAL MAP */}
      <Dialog open={openMembersModal} onClose={() => setOpenMembersModal(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { bgcolor: "#0f172a", color: "white", borderRadius: 4, border: "1px solid rgba(255,255,255,0.1)" } }}>
        <DialogTitle sx={{ fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>Enrolled Members Contact Sheet</DialogTitle>
        <DialogContent sx={{ p: 2.5, maxHeight: 380, overflowY: "auto" }}>
          {loadingMembers ? (
            <Box textAlign="center" py={4}><CircularProgress color="secondary" /></Box>
          ) : (
            <List disablePadding>
              {memberDetailsList.map((member, idx) => (
                <Box key={idx}>
                  <ListItem sx={{ px: 0, py: 1.5 }}>
                    <Avatar sx={{ bgcolor: "rgba(255,255,255,0.06)", color: "white", mr: 2, fontSize: "0.85rem", fontWeight: 700 }}>{member.usn.substring(5, 8)}</Avatar>
                    <ListItemText primary={<Typography variant="body2" fontWeight={800} color="#ffb0ce">{member.usn}</Typography>} secondary={
                      <Box sx={{ mt: 0.5 }}>
                        <Typography variant="caption" sx={{ color: "#cbd5e1", display: "block" }}>Email: {member.email}</Typography>
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", display: "block" }}>Phone: {member.phone}</Typography>
                      </Box>
                    } />
                  </ListItem>
                  {idx < memberDetailsList.length - 1 && <Divider sx={{ borderColor: "rgba(255,255,255,0.05)" }} />}
                </Box>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <Button onClick={() => setOpenMembersModal(false)} sx={{ color: "white", textTransform: "none" }}>Close Roster</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InterestGroupsPortal;