// src/components/FacultyInterestGroupsControl.jsx
import React, { useState, useEffect } from "react";
import {
  Box, Card, CardContent, Typography, Stack, Button, Chip,
  Divider, Alert, CircularProgress, Paper, Grid
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { db } from "../firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";

const FacultyInterestGroupsControl = ({ facultySapId }) => {
  const [pendingGroups, setPendingGroups] = useState([]);
  const [approvedGroups, setApprovedGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!facultySapId) return;

    // Listen to all interest group requests directed to this specific SAP ID
    const q = query(
      collection(db, "interest_groups"),
      where("approverSapId", "==", facultySapId.trim())
    );

    return onSnapshot(q, (snapshot) => {
      const pendingBuffer = [];
      const approvedBuffer = [];
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const groupObj = { id: docSnap.id, ...data };
        if (data.status === "pending_faculty") {
          pendingBuffer.push(groupObj);
        } else if (data.status === "approved") {
          approvedBuffer.push(groupObj);
        }
      });

      setPendingGroups(pendingBuffer);
      setApprovedGroups(approvedBuffer);
      setLoading(false);
    });
  }, [facultySapId]);

  const handleApproveGroup = async (groupId, groupName) => {
    setError(""); setSuccess("");
    try {
      const groupRef = doc(db, "interest_groups", groupId);
      await updateDoc(groupRef, {
        status: "approved"
      });
      setSuccess(`Interest group "${groupName}" successfully approved and deployed to student dashboards!`);
    } catch (err) {
      setError("Failed to update interest group status.");
    }
  };

  const handleRejectGroup = async (groupId, groupName) => {
    setError(""); setSuccess("");
    try {
      const groupRef = doc(db, "interest_groups", groupId);
      await updateDoc(groupRef, {
        status: "rejected"
      });
      setSuccess(`Proposal for "${groupName}" was rejected.`);
    } catch (err) {
      setError("Failed to update interest group configuration.");
    }
  };

  if (loading) return <Box textAlign="center" py={4}><CircularProgress /></Box>;

  return (
    <Box sx={{ width: "100%", mx: "auto" }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Interest Groups Clearance Panel</Typography>
        <Typography variant="caption" sx={{ color: "#c6c5d7", opacity: 0.6 }}>
          Review, authenticate, and authorize student interest group proposals for campus deployment
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>{success}</Alert>}

      <Grid container spacing={3}>
        {/* Left Side: Pending Requests Queue */}
        <Grid item xs={12} md={7}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2, color: "#ffb0ce" }}>
            Awaiting Clearance ({pendingGroups.length})
          </Typography>
          
          {pendingGroups.length === 0 ? (
            <Alert severity="info" sx={{ bgcolor: "rgba(0,0,0,0.15)", color: "white" }}>
              No pending interest group proposals require review at this time.
            </Alert>
          ) : (
            <Stack spacing={2}>
              {pendingGroups.map((group) => (
                <Card key={group.id} variant="outlined" sx={{ bgcolor: "rgba(30, 32, 33, 0.4)", color: "white", borderColor: "rgba(255,255,255,0.08)" }}>
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                      <Typography variant="h6" fontWeight={700} color="#c0c1ff">{group.name}</Typography>
                      <Chip label={`Proposed by: ${group.creatorUsn}`} size="small" variant="outlined" sx={{ color: "#cbd5e1" }} />
                    </Stack>
                    <Typography variant="body2" sx={{ color: "#cbd5e1", opacity: 0.85, mb: 3 }}>
                      {group.description}
                    </Typography>
                    <Divider sx={{ borderColor: "rgba(255,255,255,0.06)", mb: 2 }} />
                    <Stack direction="row" spacing={2} justifyContent="flex-end">
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<CancelIcon />}
                        onClick={() => handleRejectGroup(group.id, group.name)}
                        sx={{ textTransform: "none" }}
                      >
                        Reject Proposal
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={<CheckCircleIcon />}
                        onClick={() => handleApproveGroup(group.id, group.name)}
                        sx={{ textTransform: "none", fontWeight: 700 }}
                      >
                        Approve & Deploy
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Grid>

        {/* Right Side: Active / Approved Registry History */}
        <Grid item xs={12} md={5}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2, color: "#4caf50" }}>
            Approved Active Registries ({approvedGroups.length})
          </Typography>
          <Stack spacing={1.5} sx={{ maxHeight: "65vh", overflowY: "auto" }}>
            {approvedGroups.length === 0 ? (
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>
                No active groups deployed by this advisor key yet.
              </Typography>
            ) : (
              approvedGroups.map((group) => (
                <Paper key={group.id} variant="outlined" sx={{ p: 2, bgcolor: "rgba(0,0,0,0.15)", borderColor: "rgba(255,255,255,0.05)", color: "white" }}>
                  <Typography variant="body1" fontWeight={700}>{group.name}</Typography>
                  <Typography variant="caption" sx={{ color: "#9ca3af", display: "block", mt: 0.5 }}>
                    Enrolled: {group.members?.length || 0} students
                  </Typography>
                </Paper>
              ))
            )}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FacultyInterestGroupsControl;