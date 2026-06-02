// src/components/FacultyAppointmentsPortal.jsx
import React, { useState, useEffect } from "react";
import {
  Box, Card, CardContent, Typography, Stack, Button, Chip,
  Divider, Alert, CircularProgress, Paper, Grid, TextField
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import UpdateIcon from "@mui/icons-material/Update";
import { db } from "../firebase";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";

const FacultyAppointmentsPortal = ({ facultySapId }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Reschedule Management Tracking States
  const [rescheduleTargetId, setRescheduleTargetId] = useState("");
  const [newProposedDate, setNewProposedDate] = useState("");

  useEffect(() => {
    if (!facultySapId) return;
    const q = query(collection(db, "appointments"), where("facultySapId", "==", facultySapId.trim()));
    
    return onSnapshot(q, (snapshot) => {
      const buffer = [];
      snapshot.forEach((docSnap) => buffer.push({ id: docSnap.id, ...docSnap.data() }));
      setAppointments(buffer.sort((a, b) => new Date(a.date) - new Date(b.date)));
      setLoading(false);
    });
  }, [facultySapId]);

  const handleUpdateStatus = async (id, status, extraFields = {}) => {
    setError(""); setSuccess("");
    try {
      await updateDoc(doc(db, "appointments", id), {
        status,
        ...extraFields
      });
      setSuccess(`Appointment log status updated to [${status}] successfully!`);
      setRescheduleTargetId("");
      setNewProposedDate("");
    } catch (err) {
      setError("Failed to record status authorization parameters.");
    }
  };

  if (loading) return <Box textAlign="center" py={4}><CircularProgress /></Box>;

  return (
    <Box sx={{ width: "100%", mx: "auto" }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>Counselling Session Management Ledger</Typography>
      <Typography variant="caption" sx={{ color: "#c6c5d7", opacity: 0.6, display: "block", mb: 3 }}>
        Process incoming student consultation bookings, adjust allocation times, or issue schedule updates.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>{success}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Stack spacing={2}>
            {appointments.length === 0 ? (
              <Alert severity="info" sx={{ bgcolor: "rgba(0,0,0,0.15)", color: "white" }}>No student appointment logs currently map to your SAP ID.</Alert>
            ) : (
              appointments.map((apt) => (
                <Paper key={apt.id} variant="outlined" sx={{ p: 3, bgcolor: "rgba(30, 32, 33, 0.4)", color: "white", borderColor: "rgba(255,255,255,0.08)" }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={5}>
                      <Typography variant="h6" fontWeight={700} color="#c0c1ff">{apt.studentName}</Typography>
                      <Typography variant="caption" sx={{ color: "#9ca3af", display: "block" }}>USN Identifier: {apt.studentUsn}</Typography>
                      <Typography variant="body2" sx={{ mt: 1, color: "#cbd5e1" }}><strong>Reason:</strong> {apt.reason}</Typography>
                    </Grid>

                    <Grid item xs={12} md={3}>
                      <Typography variant="body2">Requested Window:</Typography>
                      <Typography variant="body1" fontWeight={700} color="#ffb0ce">{new Date(apt.date).toLocaleString()}</Typography>
                      <Box sx={{ mt: 1 }}>
                        <Chip label={apt.status.toUpperCase()} size="small" color={apt.status === "approved" ? "success" : (apt.status === "rejected" ? "error" : "warning")} />
                      </Box>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      {apt.status === "pending" && (
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button size="small" variant="outlined" color="error" startIcon={<CancelIcon />} onClick={() => handleUpdateStatus(apt.id, "rejected")}>Reject</Button>
                          <Button size="small" variant="outlined" color="warning" startIcon={<UpdateIcon />} onClick={() => setRescheduleTargetId(apt.id)}>Reschedule</Button>
                          <Button size="small" variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={() => handleUpdateStatus(apt.id, "approved")}>Accept</Button>
                        </Stack>
                      )}

                      {rescheduleTargetId === apt.id && (
                        <Box sx={{ mt: 2, p: 1.5, bgcolor: "rgba(0,0,0,0.2)", borderRadius: 2 }}>
                          <TextField fullWidth size="small" type="datetime-local" label="New Proposed Date" InputLabelProps={{ shrink: true }} value={newProposedDate} onChange={(e) => setNewProposedDate(e.target.value)} sx={{ mb: 1.5 }} />
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button size="small" color="inherit" onClick={() => setRescheduleTargetId("")}>Cancel</Button>
                            <Button size="small" variant="contained" color="warning" disabled={!newProposedDate} onClick={() => handleUpdateStatus(apt.id, "rescheduled", { rescheduleDate: newProposedDate })}>Propose Date</Button>
                          </Stack>
                        </Box>
                      )}
                    </Grid>
                  </Grid>
                </Paper>
              ))
            )}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FacultyAppointmentsPortal;