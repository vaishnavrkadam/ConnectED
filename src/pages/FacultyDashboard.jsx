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
  CircularProgress
} from "@mui/material";
import Layout from "../components/Layout";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDocs
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import DoubtResolutionDialog from '../components/DoubtResolutionDialog';
import ScheduleDoubtMeeting from '../components/ScheduleDoubtMeeting';
import AcceptChoiceDialog from '../components/AcceptChoiceDialog'; 
import ProfileSettings from '../components/ProfileSettings';
import ContactFacultyDialog from '../components/ContactFacultyDialog';
// NEW IMPORT for Custom Success Popup
import ActionSuccessDialog from '../components/ActionSuccessDialog'; // Ensure this path is correct

const FacultyDashboard = () => {
  const { user, profile, loading, signOut } = useAuth();
  if (loading || !profile) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  const [appointments, setAppointments] = useState([]);
  const [assignedDoubts, setAssignedDoubts] = useState([]);
  const [error, setError] = useState("");
  
  // State for the online resolution dialog
  const [openResolution, setOpenResolution] = useState(false);
  const [selectedDoubt, setSelectedDoubt] = useState(null);

  // States for Offline Scheduling Flow
  const [openScheduling, setOpenScheduling] = useState(false); 
  const [doubtForScheduling, setDoubtForScheduling] = useState(null); 
  
  // State for the new Custom Accept Choice Dialog
  const [doubtToAccept, setDoubtToAccept] = useState(null); 
  
  // State for Profile Settings
  const [openProfileSettings, setOpenProfileSettings] = useState(false);
  
  // State for Contact Faculty Dialog
  const [openContactFaculty, setOpenContactFaculty] = useState(false); 
  
  // NEW STATE: For the custom success popup
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupContent, setPopupContent] = useState({ title: "", message: "" });
  
  const handleClosePopup = () => {
    setPopupOpen(false);
  };


  // ===================================================================
  // DATA FETCHING 
  // ===================================================================
  useEffect(() => {
    if (!user) return; 
    const qA = query(collection(db, "appointments"), where("facultyId", "==", user.uid));
    const unsubA = onSnapshot(qA, (snap) => {
      const items = [];
      snap.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
      setAppointments(items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    });

    const qD = query(collection(db, "doubts"), where("assignedFacultyId", "==", user.uid));
    const unsubD = onSnapshot(qD, (snap) => {
      const items = [];
      snap.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
      setAssignedDoubts(items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    });

    return () => { unsubA(); unsubD(); };
  }, [user]);

  // ===================================================================
  // DOUBT MANAGEMENT LOGIC
  // ===================================================================
  
  const reassignDoubt = async (rejectedDoubt) => {
      setError("");
      const snap = await getDocs(query(collection(db, "users"), where("role", "==", "faculty")));
      
      const words = rejectedDoubt.doubt.toLowerCase().split(/\s+/);
      let bestMatch = null;
      let matchedExpertise = null;
      let bestScore = 0;

      snap.forEach((doc) => {
          const data = doc.data();
          if (doc.id === user.uid) return; 
          
          const expertiseList = (data.expertise || []).map((e) => e.toLowerCase()); 

          let score = 0;
          let localMatch = null;

          words.forEach((w) => {
              if (w.length > 2) {
                  expertiseList.forEach((e) => {
                      if (e.includes(w)) {
                          score++;
                          localMatch = e; 
                      }
                  });
              }
          });

          if (score > bestScore) {
              bestScore = score;
              bestMatch = data;
              bestMatch.id = doc.id; 
              matchedExpertise = localMatch;
          }
      });

      const isAssigned = bestMatch && bestScore > 0;
      
      const updateData = {
          lastRejectedBy: user.email,
          rejectionTimestamp: new Date().toISOString()
      };

      if (isAssigned) {
          updateData.assignedFacultyId = bestMatch.id; 
          updateData.assignedFacultyName = bestMatch.name;
          updateData.status = "assigned"; 
          updateData.subject = matchedExpertise.toUpperCase(); 
          // --- NEW: Custom Popup instead of alert
          setPopupContent({
            title: "Doubt Reassigned!",
            message: `The query has been successfully routed to ${bestMatch.name} for resolution.`
          });
          setPopupOpen(true);
          // --- END NEW
      } else {
          updateData.assignedFacultyId = null;
          updateData.assignedFacultyName = "No Expert Found (Pending)";
          updateData.status = "pending";
          // --- NEW: Custom Popup instead of alert
          setPopupContent({
            title: "Reassigned to Pending",
            message: "No new expert could be matched. The doubt is now back in the pending pool."
          });
          setPopupOpen(true);
          // --- END NEW
      }

      await updateDoc(doc(db, "doubts", rejectedDoubt.id), updateData);
  }
  
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

    } catch (e) {
        setError(`Failed to perform action (${action}) on doubt.`);
        console.error(e);
    }
  };

  const handleAcceptDoubt = (doubt) => {
    setDoubtToAccept(doubt);
  };
  
  const handleChoiceFromDialog = (choice) => {
    if (choice === 'online') {
        handleDoubtAction(doubtToAccept, "accept_online");
    } else {
        setDoubtForScheduling(doubtToAccept);
        setOpenScheduling(true);
    }
    setDoubtToAccept(null); 
  };
  
  const finalizeOfflineSchedule = async (slot) => {
    if (!doubtForScheduling || !slot) return;
    
    try {
        const assignedName = profile?.name || user?.email || "Faculty Member"; 

        await updateDoc(doc(db, "doubts", doubtForScheduling.id), { 
            status: "scheduled", 
            assignedFacultyId: user.uid, 
            assignedFacultyName: assignedName, 
            scheduleSlot: {
                day: slot.day,
                time: slot.time,
                location: slot.location || 'Faculty Office' 
            }
        });
        // --- NEW: Custom Popup instead of alert
        setPopupContent({
          title: "Appointment Confirmed!",
          message: `Meeting scheduled with student for ${slot.day} at ${slot.time}.`
        });
        setPopupOpen(true);
        // --- END NEW
        
        setDoubtForScheduling(null);
        setOpenScheduling(false);
    } catch (e) {
        setError("Failed to finalize offline schedule.");
        console.error(e);
    }
  }


  // ===================================================================
  // HELPERS 
  // ===================================================================

  const updateAppointmentStatus = async (id, status) => {
    setError("");
    try {
        await updateDoc(doc(db, "appointments", id), { status });
    } catch (e) {
        setError("Failed to update appointment status.");
        console.error(e);
    }
  };

  const statusColor = (s) => {
    switch (s) {
      case "accepted":
      case "resolved":
        return "success";
      case "rejected":
        return "error";
      case "assigned":
      case "scheduled":
        return "info";
      case "pending":
      default:
        return "warning";
    }
  };
  
  const handleResolveOnline = (doubt) => {
      setSelectedDoubt(doubt);
      setOpenResolution(true);
  }
  
  const facultyName = profile?.name || user?.email; // Get faculty name for greeting

  return (
    <Box> 
      <Layout> 
        <Typography variant="h4" fontWeight={600} gutterBottom>
            Welcome, {facultyName}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
            Manage your assigned student queries and appointments efficiently.
        </Typography>
        {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}
        
        {/* BUTTON STACK */}
        // Find the Stack with the buttons and replace with this:
        <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
            <Stack direction="row" spacing={2}>
                <Button 
                    variant="outlined" 
                    color="secondary" 
                    onClick={() => setOpenProfileSettings(true)} 
                >
                    Edit Profile & Expertise
                </Button>
                <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={() => setOpenContactFaculty(true)} 
                >
                    Contact Other Faculties
                </Button>
            </Stack>
        </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        {/* ============================================================== */}
        {/* COLUMN 1: DOUBT MANAGEMENT (Wider Column) */}
        {/* ============================================================== */}
        <Box sx={{ flex: 2 }}>
            <Card sx={{ height: '100%' }}>
                <CardContent>
                    <Typography variant="h5" fontWeight={600} sx={{ mb: 1 }}>
                        Doubt Management Queue
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    {assignedDoubts.length === 0 ? (
                        <Alert severity="info">
                            No active doubts are currently assigned to you.
                        </Alert>
                    ) : (
                        <Stack spacing={2}>
                            {assignedDoubts.map((d) => (
                                <Card 
                                    key={d.id} 
                                    variant="outlined" 
                                    sx={{ 
                                        // Styling with hover effect
                                        cursor: (d.status !== 'rejected' && d.status !== 'resolved') ? 'pointer' : 'default',
                                        bgcolor: d.status === 'assigned' ? '#1a1a2e' : (d.status === 'scheduled' ? '#1e2637' : 'background.paper'),
                                        border: d.status === 'assigned' ? '1px solid orange' : '1px solid #ccc',
                                        transition: '0.3s',
                                        '&:hover': {
                                            bgcolor: d.status === 'assigned' ? '#252a3f' : (d.status === 'scheduled' ? '#28314a' : '#f5f5f5'),
                                            boxShadow: 6,
                                            transform: 'translateY(-2px)',
                                        }
                                    }}
                                    onClick={() => (d.status !== 'rejected' && d.status !== 'resolved' && d.status !== 'scheduled') && handleResolveOnline(d)}
                                >
                                    <CardContent>
                                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                            <Box>
                                                <Typography variant="h6" color="primary.main" sx={{ fontSize: '1.1rem' }}>
                                                   {d.subject || 'General'} 
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary"> 
                                                    Student: {d.studentEmail} 
                                                </Typography>
                                            </Box>
                                            <Chip label={d.status.toUpperCase()} color={statusColor(d.status)} size="small" sx={{ mt: 0.5 }} />
                                        </Stack>

                                        <Typography mt={1} fontStyle="italic" color="text.primary"> 
                                            " {d.doubt.substring(0, 70)}{d.doubt.length > 70 ? '...' : ''} " 
                                        </Typography>

                                        {/* Display Scheduled Slot or Action Buttons */}
                                        <Box mt={2} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                            {d.status === "scheduled" && d.scheduleSlot && (
                                                <Alert severity="info" icon={false} sx={{ py: 0, px: 1, fontSize: '0.8rem' }}>
                                                    Scheduled: {d.scheduleSlot.day} at {d.scheduleSlot.time} ({d.scheduleSlot.location})
                                                </Alert>
                                            )}

                                            {d.status === "accepted" && (
                                                 <Button variant="outlined" color="success" size="small"
                                                    onClick={(e) => { e.stopPropagation(); updateDoc(doc(db, "doubts", d.id), { status: "resolved", resolvedAt: new Date().toISOString() }); }}
                                                >Mark as Resolved (Offline)</Button>
                                            )}

                                            {d.status === "assigned" && (
                                                <>
                                                    <Button variant="contained" color="primary" size="small"
                                                        onClick={(e) => { e.stopPropagation(); handleAcceptDoubt(d); }} 
                                                    >Accept Doubt</Button>
                                                    <Button variant="outlined" color="error" size="small"
                                                        onClick={(e) => { e.stopPropagation(); handleDoubtAction(d, "reject"); }}
                                                    >Reject</Button>
                                                </>
                                            )}
                                            
                                        </Box>
                                    </CardContent>
                                </Card>
                            ))}
                        </Stack>
                    )}
                </CardContent>
            </Card>
        </Box>

        {/* ============================================================== */}
        {/* COLUMN 2: APPOINTMENT REQUESTS (Narrower Column) */}
        {/* ============================================================== */}
        <Box sx={{ flex: 1 }}>
            <Card sx={{ height: '100%' }}>
                <CardContent>
                    <Typography variant="h5" fontWeight={600} sx={{ mb: 1 }}>
                        Appointment Requests
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    {appointments.length === 0 ? (
                        <Typography color="text.secondary" fontStyle="italic">
                            No pending requests.
                        </Typography>
                    ) : (
                        <Stack spacing={2}>
                            {appointments.map((a) => (
                                <Card key={a.id} variant="outlined" 
                                    sx={{ 
                                        bgcolor: a.status === 'pending' ? '#191919ff' : 'background.paper',
                                        transition: '0.3s',
                                        '&:hover': {
                                            bgcolor: a.status === 'pending' ? '#252a3f' : '#f5f5f5',
                                            boxShadow: 2
                                        }
                                    }}
                                >
                                    <CardContent sx={{ p: 2 }}>
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography fontWeight={600} sx={{ fontSize: '0.9rem', color: 'text.primary' }}>
                                                {a.studentEmail} 
                                            </Typography>
                                            <Chip label={a.status.toUpperCase()} color={statusColor(a.status)} size="small" />
                                        </Stack>
                                        <Typography variant="body2" mt={1} color="text.primary">{a.reason.substring(0, 40)}...</Typography>
                                        {a.slot && (<Typography variant="caption" color="primary.dark">Slot: {a.slot.day} at {a.slot.start}</Typography>)}
                                        
                                        {a.status === "pending" && (
                                            <Stack direction="row" spacing={1} mt={1} justifyContent="flex-end">
                                                <Button variant="contained" size="small" sx={{ fontSize: '0.7rem' }} onClick={() => updateAppointmentStatus(a.id, "accepted")}>Accept</Button>
                                                <Button variant="outlined" color="error" size="small" sx={{ fontSize: '0.7rem' }} onClick={() => updateAppointmentStatus(a.id, "rejected")}>Reject</Button>
                                            </Stack>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </Stack>
                    )}
                </CardContent>
            </Card>
        </Box>
      </Stack>
      
      {/* 1. Doubt Resolution Dialog (Online Chat/Final Resolve) */}
      {selectedDoubt && (
          <DoubtResolutionDialog
              open={openResolution}
              onClose={() => setOpenResolution(false)}
              doubt={selectedDoubt}
              isFaculty={true}
          />
      )}
      
      {/* 2. Schedule Offline Meeting Dialog */}
      {doubtForScheduling && (
          <ScheduleDoubtMeeting
              open={openScheduling}
              onClose={() => setOpenScheduling(false)}
              doubt={doubtForScheduling}
              onScheduleFinalized={finalizeOfflineSchedule}
          />
      )}
      
      {/* 3. Custom Choice Dialog (Online vs Offline) */}
      {doubtToAccept && (
          <AcceptChoiceDialog
              open={!!doubtToAccept}
              onClose={() => setDoubtToAccept(null)}
              doubt={doubtToAccept}
              onChooseOnline={() => handleChoiceFromDialog('online')}
              onChooseOffline={() => handleChoiceFromDialog('offline')}
          />
      )}

      {/* 4. Profile Settings Dialog */}
      <ProfileSettings
        open={openProfileSettings}
        onClose={() => setOpenProfileSettings(false)}
      />

      {/* 5. Contact Faculty Dialog */}
      <ContactFacultyDialog
        open={openContactFaculty}
        onClose={() => setOpenContactFaculty(false)}
      />
      
      {/* 6. NEW: Custom Success/Reassignment Popup */}
      <ActionSuccessDialog 
        open={popupOpen}
        handleClose={handleClosePopup}
        title={popupContent.title}
        message={popupContent.message}
      />

    </Layout>
    </Box>
  );
};

export default FacultyDashboard;