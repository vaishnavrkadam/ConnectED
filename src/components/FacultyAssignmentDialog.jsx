import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Stack,
  Card,
  CardContent,
  Alert
} from "@mui/material";
import { db } from "../firebase";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

const FacultyAssignmentDialog = ({ open, onClose, doubtText, onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [matchedFaculty, setMatchedFaculty] = useState([]);
  const [error, setError] = useState(null);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [matchedSubject, setMatchedSubject] = useState("GENERAL / NO MATCH");

  // --- Matching Logic (Moved from StudentDashboard) ---
  const runFacultyMatch = async (text) => {
    setLoading(true);
    setError(null);
    setMatchedFaculty([]);
    setSelectedFaculty(null);

    if (!text.trim()) {
      setLoading(false);
      return;
    }

    try {
      const snap = await getDocs(
        query(collection(db, "users"), where("role", "==", "faculty"))
      );

      const words = text.toLowerCase().split(/\s+/);
      const results = [];
      let globalBestScore = 0;

      snap.forEach((doc) => {
        const data = doc.data();
        // Use doc.id for the assignedFacultyId
        data.id = doc.id; 
        
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
        
        if (score > 0) {
            results.push({ ...data, score, matchedExpertise: localMatch });
            if (score > globalBestScore) {
                globalBestScore = score;
                setMatchedSubject(localMatch.toUpperCase());
            }
        }
      });

      // Sort results by score (highest first)
      const sortedResults = results.sort((a, b) => b.score - a.score);
      setMatchedFaculty(sortedResults);
      
      // Auto-select the top match as the default
      if (sortedResults.length > 0) {
          setSelectedFaculty(sortedResults[0]);
      }
      
    } catch (e) {
      setError("Failed to fetch faculty list for matching.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Run matching when dialog opens
  useEffect(() => {
    if (open && doubtText) {
      runFacultyMatch(doubtText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, doubtText]);

  // --- Final Submission ---
  const finalizeAssignment = async () => {
    if (!selectedFaculty || !user) return;
    
    setLoading(true);
    setError(null);

    try {
        const isAssigned = selectedFaculty.score > 0;

        const newDoubt = {
            studentId: user.uid,
            studentEmail: user.email,
            doubt: doubtText,
            
            subject: matchedSubject, 
            assignedFacultyId: selectedFaculty.id, 
            assignedFacultyName: selectedFaculty.name,
            status: isAssigned ? "assigned" : "pending", 
            createdAt: new Date().toISOString()
        };
        
        await addDoc(collection(db, "doubts"), newDoubt);
        
        // Clear inputs and close dialog
        onSuccess(); 
        onClose();
    } catch (e) {
        setError("Error submitting final assignment.");
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const handleClose = () => {
      // Clear state when closing
      setMatchedFaculty([]);
      setSelectedFaculty(null);
      setError(null);
      onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Select Faculty Expert</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Your Doubt: <strong>"{doubtText}"</strong>
        </Typography>

        {loading ? (
          <Box textAlign="center" py={4}>
            <CircularProgress />
            <Typography variant="body2" mt={2}>Finding best matches...</Typography>
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : matchedFaculty.length === 0 ? (
          <Alert severity="warning">
            No strong keyword matches found. You must select "Not Assigned" below.
          </Alert>
        ) : (
          <Stack spacing={2}>
            <Typography variant="subtitle1">
                Top Matching Faculty ({matchedFaculty.length} Results):
            </Typography>
            
            {matchedFaculty.map((f) => (
              <Card 
                key={f.id} 
                variant="outlined"
                onClick={() => setSelectedFaculty(f)}
                sx={{ 
                    cursor: 'pointer',
                    border: f.id === selectedFaculty?.id ? '2px solid' : '1px solid',
                    borderColor: f.id === selectedFaculty?.id ? 'primary.main' : 'grey.300',
                    bgcolor: f.id === selectedFaculty?.id ? 'primary.light' : 'background.paper',
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="body1" fontWeight={600}>
                    {f.name} ({f.department})
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Match Score: {f.score} | Expertise: {f.matchedExpertise}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="error" variant="outlined">Cancel</Button>
        <Button 
            onClick={() => setSelectedFaculty({ id: null, name: "Not Assigned", score: 0 })} 
            disabled={selectedFaculty?.id === null || loading}
        >
            Select 'Not Assigned'
        </Button>
        <Button 
            onClick={finalizeAssignment} 
            color="primary" 
            variant="contained" 
            disabled={!selectedFaculty || loading || selectedFaculty.id === null}
        >
          {loading ? <CircularProgress size={20} color="inherit" /> : `Assign to ${selectedFaculty?.name || 'Faculty'}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FacultyAssignmentDialog;