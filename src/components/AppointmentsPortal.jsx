// src/components/AppointmentsPortal.jsx
import React, { useState, useEffect } from "react";
import {
  Box, Card, CardContent, Typography, Stack, TextField, Button,
  Chip, Divider, Alert, CircularProgress, Grid, MenuItem, Paper
} from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PersonIcon from "@mui/icons-material/Person";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import { db } from "../firebase";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";

const AppointmentsPortal = ({ studentUsn, studentName, counsellorSapId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [facultyList, setFacultyList] = useState([]);
  const [myAppointments, setMyAppointments] = useState([]);
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentReason, setAppointmentReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Unique departments for filtering
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    // 1. Fetch Faculty Records
    const unsubFaculty = onSnapshot(collection(db, "faculty"), (snapshot) => {
      const buffer = [];
      const depts = new Set(["All"]);
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        buffer.push({ id: docSnap.id, ...data });
        if (data.department) depts.add(data.department.toUpperCase());
      });
      setFacultyList(buffer);
      setDepartments(Array.from(depts));
    });

    // 2. Fetch Student's Existing Appointments
    const qApts = query(collection(db, "appointments"), where("studentUsn", "==", studentUsn.toUpperCase()));
    const unsubApts = onSnapshot(qApts, (snapshot) => {
      const buffer = [];
      snapshot.forEach((docSnap) => buffer.push({ id: docSnap.id, ...docSnap.data() }));
      setMyAppointments(buffer.sort((a, b) => new Date(b.date) - new Date(a.date)));
      setLoading(false);
    });

    return () => { unsubFaculty(); unsubApts(); };
  }, [studentUsn]);

  const handleBookAppointment = async (e, directCounsellorId = null) => {
    if (e) e.preventDefault();
    setError(""); setSuccess("");

    const targetFacultyId = directCounsellorId || selectedFaculty;
    if (!targetFacultyId) {
      setError("Please select a faculty member first.");
      return;
    }
    if (!appointmentDate) {
      setError("Please select a preferred date and time.");
      return;
    }
    if (!appointmentReason.trim()) {
      setError("Please provide a brief reason for the appointment.");
      return;
    }

    const matchedFaculty = facultyList.find(f => f.id === targetFacultyId);
    const facultyNameString = matchedFaculty ? matchedFaculty.name : `Faculty (${targetFacultyId})`;

    try {
      await addDoc(collection(db, "appointments"), {
        studentUsn: studentUsn.toUpperCase(),
        studentName: studentName,
        facultySapId: targetFacultyId,
        facultyName: facultyNameString,
        date: appointmentDate,
        reason: appointmentReason.trim(),
        status: "pending", // Initial state status pipeline
        rescheduleDate: null,
        createdAt: new Date().toISOString()
      });

      setSuccess(`Appointment request sent to ${facultyNameString}!`);
      setSelectedFaculty("");
      setAppointmentDate("");
      setAppointmentReason("");
    } catch (err) {
      setError("Failed to log appointment registration entry.");
    }
  };

  const filteredFaculty = facultyList.filter(f => 
    selectedDept === "All" || (f.department && f.department.toUpperCase() === selectedDept)
  );

  if (loading) return <Box textAlign="center" py={4}><CircularProgress color="secondary" /></Box>;

  return (
    <Box sx={{ width: "100%", mx: "auto" }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 1, color: "white" }}>Book an Appointment</Typography>
      <Typography variant="caption" sx={{ color: "#c6c5d7", opacity: 0.6, display: "block", mb: 3 }}>
        Schedule counseling links or sync open consultation slots with institutional faculty members.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>{success}</Alert>}

      <Grid container spacing={3.5}>
        {/* Left Side: Booking Request Form */}
        <Grid item xs={12} lg={5}>
          {/* QUICK-ACTION: MEET MY COUNSELLOR */}
          {counsellorSapId && (
            <Card sx={{ bgcolor: "rgba(192, 193, 255, 0.08)", border: "1px dashed #c0c1ff", borderRadius: 3, mb: 3 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="subtitle2" fontWeight={800} color="#c0c1ff">Assigned Institutional Counselor</Typography>
                    <Typography variant="caption" sx={{ color: "#cbd5e1" }}>Direct Routing Active (SAP ID: {counsellorSapId})</Typography>
                  </Box>
                  <Button 
                    variant="contained" 
                    color="secondary" 
                    size="small"
                    startIcon={<GroupAddIcon />}
                    disabled={!appointmentDate || !appointmentReason.trim()}
                    onClick={() => handleBookAppointment(null, counsellorSapId)}
                    sx={{ textTransform: "none", fontWeight: 700 }}
                  >
                    Meet My Counsellor
                  </Button>
                </Stack>
                {(!appointmentDate || !appointmentReason.trim()) && (
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: "block", fontStyle: "italic" }}>
                    * Fill in the Date and Reason below to enable direct counseling routing.
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}

          <Card sx={{ bgcolor: "rgba(30, 32, 33, 0.4)", color: "white", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              {/* Replace the layout form wrapper block inside src/components/AppointmentsPortal.jsx */}
                <Box component="form" onSubmit={(e) => handleBookAppointment(e)}>
                <Grid container spacing={2.5}> {/* Added optimized row spacing gaps */}
                    
                    {/* 1. Department Filter Selector */}
                    <Grid item xs={12} md={4}>
                    <TextField 
                        select 
                        fullWidth 
                        size="small" 
                        label="Filter by Department Study" 
                        value={selectedDept} 
                        onChange={(e) => { setSelectedDept(e.target.value); setSelectedFaculty(""); }}
                        sx={{ "& .MuiOutlinedInput-root": { color: "white" } }}
                    >
                        {departments.map((dept) => <MenuItem key={dept} value={dept}>{dept}</MenuItem>)}
                    </TextField>
                    </Grid>

                    {/* 2. Faculty Advisor Dropdown Selection */}
                    <Grid item xs={12} md={8}>
                    <TextField 
                        select 
                        fullWidth 
                        size="small" 
                        label="Select Faculty Member" 
                        value={selectedFaculty} 
                        onChange={(e) => setSelectedFaculty(e.target.value)} 
                        required={!counsellorSapId}
                        sx={{ "& .MuiOutlinedInput-root": { color: "white" } }}
                    >
                        {filteredFaculty.map((f) => (
                        <MenuItem key={f.id} value={f.id}>{f.name} ({f.department || "General"})</MenuItem>
                        ))}
                    </TextField>
                    </Grid>

                    {/* 3. DateTime-Local Form Value Wrapper */}
                    <Grid item xs={12}>
                    <TextField 
                        fullWidth 
                        size="small" 
                        type="datetime-local" 
                        label="Preferred Date & Time" 
                        InputLabelProps={{ shrink: true }} 
                        value={appointmentDate} 
                        onChange={(e) => setAppointmentDate(e.target.value)} 
                        required 
                        sx={{ 
                        "& .MuiOutlinedInput-root": { color: "white" },
                        "& input::-webkit-calendar-picker-indicator": { filter: "invert(1)" } // Clears date icon visible properties
                        }} 
                    />
                    </Grid>

                    {/* 4. Textarea Abstract Reason Field */}
                    <Grid item xs={12}>
                    <TextField 
                        fullWidth 
                        multiline 
                        rows={3} 
                        label="Reason for Session Request" 
                        value={appointmentReason} 
                        onChange={(e) => setAppointmentReason(e.target.value)} 
                        required 
                        placeholder="Provide context regarding the academic or technical guidance needed..." 
                        sx={{ "& .MuiOutlinedInput-root": { color: "white" } }}
                    />
                    </Grid>
                </Grid>

                {/* Submission Button Container Component */}
                <Button 
                    type="submit" 
                    variant="contained" 
                    color="primary" 
                    fullWidth 
                    startIcon={<CalendarMonthIcon />} 
                    sx={{ mt: 3, py: 1.2, textTransform: "none", fontWeight: 700, borderRadius: 2 }}
                >
                    Request General Appointment
                </Button>
                </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Side: Appointment Status Feed */}
        <Grid item xs={12} lg={7}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2, color: "#c0c1ff" }}>My Appointment Log Requests ({myAppointments.length})</Typography>
          <Stack spacing={2} sx={{ maxHeight: "65vh", overflowY: "auto" }}>
            {myAppointments.length === 0 ? (
              <Alert severity="info" sx={{ bgcolor: "rgba(0,0,0,0.15)", color: "white" }}>No session bookings logged to your active academic profile.</Alert>
            ) : (
              myAppointments.map((apt) => (
                <Paper key={apt.id} variant="outlined" sx={{ p: 2.5, bgcolor: "rgba(0,0,0,0.2)", borderColor: "rgba(255,255,255,0.06)", color: "white" }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                    <Typography variant="body1" fontWeight={700} color="#ffb0ce">{apt.facultyName}</Typography>
                    <Chip 
                      label={apt.status.toUpperCase()} 
                      size="small" 
                      color={apt.status === "approved" ? "success" : (apt.status === "rejected" ? "error" : "warning")} 
                      sx={{ fontWeight: 800, fontSize: "0.65rem" }} 
                    />
                  </Stack>
                  <Typography variant="body2" sx={{ color: "#cbd5e1", opacity: 0.85, mb: 1 }}>Reason: {apt.reason}</Typography>
                  <Typography variant="caption" display="block" sx={{ color: "rgba(255,255,255,0.5)" }}>
                    Target Session Window: <strong>{new Date(apt.date).toLocaleString()}</strong>
                  </Typography>
                  {apt.status === "rescheduled" && (
                    <Alert severity="warning" sx={{ mt: 1.5, py: 0, bgcolor: "rgba(217, 119, 6, 0.15)", color: "#fbbf24" }}>
                      Proposed Faculty Reschedule: <strong>{new Date(apt.rescheduleDate).toLocaleString()}</strong>
                    </Alert>
                  )}
                </Paper>
              ))
            )}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AppointmentsPortal;