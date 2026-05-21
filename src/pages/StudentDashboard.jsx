import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  Stack,
  Alert,
  Divider,
  Chip
} from "@mui/material";
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import HistoryIcon from '@mui/icons-material/History';
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import Layout from "../components/Layout";
import FindFacultyDialog from "../components/FindFacultyDialog";
import FacultyAssignmentDialog from "../components/FacultyAssignmentDialog"; 
import DoubtResolutionDialog from "../components/DoubtResolutionDialog"; 
import ExpertiseSidebar from '../components/ExpertiseSidebar'; 
import { useAuth } from "../context/AuthContext"; 

const StudentDashboard = () => {
  const { user, profile, loading, signOut } = useAuth();
  if (loading || !profile) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  const [doubtText, setDoubtText] = useState("");
  const [myDoubts, setMyDoubts] = useState([]);
  const [myAppointments, setMyAppointments] = useState([]); // Appointments state added
  const [openFind, setOpenFind] = useState(false);
  const [openAssignment, setOpenAssignment] = useState(false); 
  
  // State for the resolution dialog (Viewing response)
  const [openResolution, setOpenResolution] = useState(false);
  const [selectedDoubt, setSelectedDoubt] = useState(null);
  
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  
  const [avgResolutionTime, setAvgResolutionTime] = useState(null); // <-- NEW STATE for KPI


  /* LOAD DOUBTS */
  useEffect(() => {
    if (!user) return; 

    const q = query(collection(db, "doubts"), where("studentId", "==", user.uid));

    const unsub = onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setMyDoubts(list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    });

    return () => unsub();
  }, [user]); 

  /* LOAD APPOINTMENTS */
  useEffect(() => {
    if (!user) return; 

    const q = query(collection(db, "appointments"), where("studentId", "==", user.uid));

    const unsub = onSnapshot(q, (snap) => {
        const list = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setMyAppointments(list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    });

    return () => unsub();
  }, [user]); 

  // =========================================================
  // KPI CALCULATION LOGIC
  // =========================================================
  useEffect(() => {
    if (myDoubts.length === 0) {
        setAvgResolutionTime(null);
        return;
    }

    let totalTimeMs = 0;
    let resolvedCount = 0;

    myDoubts.forEach(doubt => {
        // Ensure doubt is resolved and has timestamps
        if (doubt.status === 'resolved' && doubt.resolvedAt && doubt.createdAt) {
            const submissionTime = new Date(doubt.createdAt).getTime();
            const resolutionTime = new Date(doubt.resolvedAt).getTime();
            
            if (resolutionTime > submissionTime) {
                totalTimeMs += resolutionTime - submissionTime;
                resolvedCount++;
            }
        }
    });

    if (resolvedCount > 0) {
        // Calculate average time in hours
        const avgTimeHours = (totalTimeMs / resolvedCount) / (1000 * 60 * 60); 
        
        // Format to two decimal places
        setAvgResolutionTime(avgTimeHours.toFixed(2));
    } else {
        setAvgResolutionTime(null);
    }
  }, [myDoubts]); // Recalculate whenever doubts list changes


  // Function to open the faculty selection dialog
  const handleAssignDoubt = () => {
    const activeDoubts = myDoubts.filter(d => d.status !== 'resolved').length;
    if (activeDoubts >= 5) {
      setError("You have too many active doubts. Please wait for faculty to resolve them first.");
      return;
    }
    if (!doubtText.trim()) {
        setError("Doubt description cannot be empty.");
        setTimeout(() => setError(""), 3000); 
        return;
    }
    setOpenAssignment(true); 
  };
  
  // Function to clear the text field after successful submission
  const clearDoubtText = () => {
      setDoubtText("");
  };

  // Function to open the resolution viewing dialog
  const handleViewDoubt = (doubt) => {
      setSelectedDoubt(doubt);
      setOpenResolution(true);
  };
  
  // Helper for rendering the KPI
  const renderAvgTime = () => {
    if (avgResolutionTime) {
        return (
            <Card sx={{ p: 2, bgcolor: 'primary.light', minWidth: 200, textAlign: 'center', boxShadow: 3 }}>
                <Typography variant="h5" fontWeight={700} color="primary.main">
                    {avgResolutionTime} hrs
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    Avg. Resolution Time
                </Typography>
            </Card>
        );
    }
    return null;
  };


  return (
    <Layout> 
      {/* FIX: Container for the Sidebar and Main Content */}
      <Box sx={{ display: 'flex', minHeight: '100vh', mt: -4, ml: -20, mr: -10 }}> 
        
        {/* SIDEBAR */}
        <ExpertiseSidebar /> 
        
        {/* Main Content Area */}
        <Box sx={{ flexGrow: 1, p: 3, pt: 4 }}> 
            <Typography variant="h4" fontWeight={600} gutterBottom>
                Student Portal
            </Typography>
            <Divider sx={{ mb: 3 }} />

            {/* Action Button, KPI, & Feedback */}
            {/* Replace your Action Button Stack with this: */}
            <Stack direction="row" spacing={3} justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}> 
                <Stack direction="row" spacing={2} alignItems="center">
                    {renderAvgTime()} 
                    <Button
                        variant="contained"
                        color="secondary"
                        onClick={() => setOpenFind(true)}
                    >
                        Faculty Locator
                    </Button>
                </Stack>
            </Stack>
        

            {/* ROW 1: ASK DOUBT */}
            <Card sx={{ mb: 4, boxShadow: 6, borderLeft: '5px solid #1976d2' }}>
              <CardContent>
                <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center' }}>
                    <QuestionMarkIcon color="primary" sx={{ mr: 1 }} />
                    Ask a New Doubt
                </Typography>
                <TextField
                  multiline
                  minRows={4}
                  fullWidth
                  value={doubtText}
                  onChange={(e) => setDoubtText(e.target.value)}
                  sx={{ my: 2 }}
                  placeholder="Describe your doubt clearly and concisely. The system will match you with the best expert."
                  helperText="Be detailed to ensure the best faculty match."
                />
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={handleAssignDoubt}
                  disabled={!doubtText.trim()}
                >
                  Select Faculty & Send Doubt
                </Button>
              </CardContent>
            </Card>

            {/* ROW 2: YOUR DOUBTS HISTORY */}
            <Card sx={{ mb: 4, boxShadow: 2 }}>
              <CardContent>
                <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <HistoryIcon sx={{ mr: 1 }} />
                    Your Doubt History
                </Typography>
                
                {myDoubts.length === 0 ? (
                  <Alert severity="info">No doubts submitted yet. Ask your first doubt above!</Alert>
                ) : (
                  <Stack spacing={2}>
                    {myDoubts.map((d) => (
                      <Card 
                        key={d.id} 
                        variant="outlined"
                        onClick={() => handleViewDoubt(d)} // <-- Click to view conversation
                        sx={{ 
                            cursor: 'pointer',
                            transition: '0.3s',
                            '&:hover': { bgcolor: '#fafafa' }
                        }}
                      >
                        <CardContent>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="h6" color="primary.dark" sx={{ fontSize: '1.1rem' }}>
                              {d.subject}
                            </Typography>
                            <Chip
                              label={d.status.toUpperCase()}
                              color={d.status === "resolved" || d.status === "accepted" || d.status === "scheduled" ? "success" : "error"}
                              size="small"
                            />
                          </Stack>

                          <Typography sx={{ mt: 0.5, fontStyle: 'italic' }}>
                            {d.doubt.substring(0, 80)}{d.doubt.length > 80 ? '...' : ''}
                          </Typography>

                          {d.assignedFacultyName && (
                            <Typography variant="caption" sx={{ mt: 1, display: "block", color: 'text.secondary' }}>
                                Assigned To: **{d.assignedFacultyName}** </Typography>
                          )}
                          
                          {d.status === "scheduled" && d.scheduleSlot && (
                            <Typography variant="caption" color="primary.dark" fontWeight={600} mt={0.5}>
                                Meeting Scheduled: {d.scheduleSlot.day} at {d.scheduleSlot.time} ({d.scheduleSlot.location}) - Tap to see details.
                            </Typography>
                          )}

                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
            
            {/* ROW 3: YOUR APPOINTMENT HISTORY */}
            <Card sx={{ boxShadow: 2 }}>
              <CardContent>
                <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <HistoryIcon sx={{ mr: 1 }} />
                    Your Appointment History
                </Typography>
                
                {myAppointments.length === 0 ? (
                  <Alert severity="info">You have not requested any appointments yet.</Alert>
                ) : (
                  <Stack spacing={2}>
                    {myAppointments.map((a) => (
                      <Card key={a.id} variant="outlined">
                        <CardContent>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="h6" color="primary.dark" sx={{ fontSize: '1.1rem' }}>
                              {a.facultyName || 'Faculty Member'}
                            </Typography>
                            <Chip
                              label={a.status.toUpperCase()}
                              color={a.status === "accepted" ? "success" : (a.status === "rejected" ? "error" : "warning")}
                              size="small"
                            />
                          </Stack>

                          <Typography sx={{ mt: 0.5 }}>
                            Reason: {a.reason}
                          </Typography>

                          {a.slot && (
                            <Typography variant="caption" color="text.secondary" fontWeight={600} mt={0.5}>
                                Slot: {a.slot.day} at {a.slot.start} - {a.slot.end}
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
        </Box> {/* End of Main Content Area */}
        
      </Box> {/* End of Sidebar/Content Container */}
      
      {/* Existing Dialogs (Global Scope) */}
      <FindFacultyDialog
        open={openFind}
        onClose={() => setOpenFind(false)}
      />

      <FacultyAssignmentDialog
        open={openAssignment}
        onClose={() => setOpenAssignment(false)}
        doubtText={doubtText}
        onSuccess={clearDoubtText}
      />
      
      {selectedDoubt && (
          <DoubtResolutionDialog
              open={openResolution}
              onClose={() => setOpenResolution(false)}
              doubt={selectedDoubt}
              isFaculty={false}
          />
      )}
    </Layout>
  );
};

export default StudentDashboard;