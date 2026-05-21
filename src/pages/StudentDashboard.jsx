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
  Chip,
  CircularProgress
} from "@mui/material";
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import HistoryIcon from '@mui/icons-material/History';
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  or,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import Layout from "../components/Layout";
import FindFacultyDialog from "../components/FindFacultyDialog";
import DoubtResolutionDialog from "../components/DoubtResolutionDialog"; 
import ExpertiseSidebar from '../components/ExpertiseSidebar'; 
import { useAuth } from "../context/AuthContext"; 

const getAsDate = (val) => {
  if (!val) return new Date(0);
  if (typeof val.toDate === 'function') return val.toDate();
  return new Date(val);
};

const SubmitDoubtComponent = () => {
  const { profile, extendedProfile } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateDoubt = async (title, description) => {
    // Generate simple client-side search array for zero-cost semantic search execution
    const searchKeywords = title.toLowerCase().split(" ").filter(word => word.length > 2);

    const doubtPayload = {
      studentUsn: profile.primaryId,       // Updated to use Natural Key USN
      studentName: extendedProfile.name,   // Sourced directly from verified live document
      title: title,
      description: description,
      searchKeywords: searchKeywords,      // Client side processing for spark tier optimization
      assignedFacultyId: extendedProfile.counsellorSapId, // Base routing initially targets default counsellor SAP ID
      status: "pending",
      rejectedBy: [],                      // Tracks faculty rejections for the re-routing engine
      createdAt: serverTimestamp(),
      resolvedAt: null,
      solutionSummary: null
    };

    await addDoc(collection(db, "doubts"), doubtPayload);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError("Please fill in both title and description.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await handleCreateDoubt(title, description);
      setSuccess("Doubt submitted successfully!");
      setTitle("");
      setDescription("");
    } catch (err) {
      console.error(err);
      setError("Failed to submit doubt. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ mb: 4, boxShadow: 6, borderLeft: '5px solid #1976d2' }}>
      <CardContent>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <QuestionMarkIcon color="primary" sx={{ mr: 1 }} />
            Ask a New Doubt
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            label="Doubt Title"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            sx={{ mb: 2 }}
            placeholder="e.g. Stuck on React state update after Firestore write"
            required
            disabled={loading}
          />
          <TextField
            label="Description"
            multiline
            minRows={4}
            fullWidth
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            sx={{ mb: 2 }}
            placeholder="Describe your doubt in detail..."
            required
            disabled={loading}
          />
          <Button 
            type="submit"
            variant="contained" 
            color="primary"
            disabled={loading || !title.trim() || !description.trim()}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : "Submit Doubt"}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

const StudentDashboard = () => {
  const { user, profile, loading, signOut } = useAuth();
  if (loading || !profile) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  const [myDoubts, setMyDoubts] = useState([]);
  const [myAppointments, setMyAppointments] = useState([]); // Appointments state added
  const [openFind, setOpenFind] = useState(false);
  
  // State for the resolution dialog (Viewing response)
  const [openResolution, setOpenResolution] = useState(false);
  const [selectedDoubt, setSelectedDoubt] = useState(null);
  
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  
  const [avgResolutionTime, setAvgResolutionTime] = useState(null); // <-- NEW STATE for KPI


  /* LOAD DOUBTS */
  useEffect(() => {
    if (!user) return;

    const conditions = [];
    if (profile?.primaryId) {
      conditions.push(where("studentUsn", "==", profile.primaryId));
    }
    if (user?.uid) {
      conditions.push(where("studentId", "==", user.uid));
    }

    if (conditions.length === 0) return;

    const q = query(
      collection(db, "doubts"),
      conditions.length > 1 ? or(...conditions) : conditions[0]
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setMyDoubts(list.sort((a, b) => getAsDate(b.createdAt).getTime() - getAsDate(a.createdAt).getTime()));
    });

    return () => unsub();
  }, [user, profile]); 

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
            const submissionTime = getAsDate(doubt.createdAt).getTime();
            const resolutionTime = getAsDate(doubt.resolvedAt).getTime();
            
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
            <SubmitDoubtComponent />

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
                              {d.title || d.subject || "Untitled doubt"}
                            </Typography>
                            <Chip
                              label={d.status.toUpperCase()}
                              color={d.status === "resolved" || d.status === "accepted" || d.status === "scheduled" ? "success" : "error"}
                              size="small"
                            />
                          </Stack>

                          <Typography sx={{ mt: 0.5, fontStyle: 'italic' }}>
                            {(d.description || d.doubt || "").substring(0, 80)}{(d.description || d.doubt || "").length > 80 ? '...' : ''}
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