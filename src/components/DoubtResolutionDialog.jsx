import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  Box,
  CircularProgress,
  Divider,
  Alert,
  Stack,
  Chip,
} from '@mui/material';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  updateDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const DoubtResolutionDialog = ({ open, onClose, doubt, isFaculty }) => {
  const { user } = useAuth();
  const [resolutionText, setResolutionText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [responses, setResponses] = useState([]);
  
  // Reset state and subscribe to responses when dialog opens
  useEffect(() => {
    if (open && doubt?.id) {
        setResolutionText('');
        setError(null);
        
        const responsesRef = collection(db, 'doubts', doubt.id, 'responses');
        const q = query(responsesRef, orderBy('createdAt', 'asc'));
        
        const unsub = onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
            setResponses(list);
        }, (err) => {
            console.error("Error fetching responses:", err);
            setError("Could not load resolution history.");
        });
        
        return () => unsub();
    }
  }, [open, doubt]);

  // Handle resolution submission by either party
  const handleSubmitResolution = async () => {
    if (!resolutionText.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const responseData = {
        senderId: user.uid,
        senderEmail: user.email,
        senderRole: isFaculty ? 'faculty' : 'student',
        text: resolutionText,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'doubts', doubt.id, 'responses'), responseData);
      
      // Clear the input field
      setResolutionText('');
      
      // If the faculty sends the first response, automatically transition the status to 'accepted' 
      // if it was still 'assigned', to prevent the student from seeing the Accept/Reject buttons later.
      if (isFaculty && doubt.status === 'assigned') {
          await updateDoc(doc(db, 'doubts', doubt.id), { status: 'accepted' });
      }
      
    } catch (e) {
      setError('Failed to send message. Please try again.');
      console.error('Resolution submission error:', e);
    } finally {
      setLoading(false);
    }
  };
  
  // Quick function for faculty to mark as resolved (Offline resolution/Final closure)
  const markAsResolved = async () => {
    if (doubt.status === 'resolved') return;
    try {
        await updateDoc(doc(db, 'doubts', doubt.id), { 
            status: 'resolved',
            resolvedAt: new Date().toISOString(),
        });
    } catch (e) {
        setError("Failed to mark resolved.");
        console.error("Failed to mark resolved:", e);
    }
  }

  const isDoubtResolved = doubt?.status === 'resolved';
  // Faculty can send messages if the doubt is 'assigned' or 'accepted'
  const canSendMessage = isFaculty && (doubt?.status === 'assigned' || doubt?.status === 'accepted');
  // Student can send messages if the doubt is 'accepted'
  const canStudentReply = !isFaculty && doubt?.status === 'accepted';
  
  const showInput = canSendMessage || canStudentReply;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Doubt Resolution: {doubt?.title || doubt?.subject}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="h6" gutterBottom>
            {doubt?.description || doubt?.doubt} 
            <Chip 
                label={doubt?.status.toUpperCase()} 
                size="small" 
                color={isDoubtResolved ? 'success' : 'info'} 
                sx={{ ml: 1 }}
            />
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Assigned to: {doubt?.assignedFacultyName} | Student: {doubt?.studentEmail}
        </Typography>
        <Divider sx={{ my: 2 }} />

        {/* Responses/Conversation History */}
        <Stack spacing={2} sx={{ maxHeight: 300, overflowY: 'auto', p: 1, mb: 3, border: '1px solid #eee', borderRadius: 1 }}>
            {responses.length === 0 ? (
                <Typography color="text.secondary" fontStyle="italic">No conversation yet. Be the first to start.</Typography>
            ) : (
                responses.map((res) => (
                    <Box 
                        key={res.id} 
                        sx={{ 
                            p: 1.5, 
                            borderRadius: 2, 
                            alignSelf: res.senderRole === 'faculty' ? 'flex-end' : 'flex-start',
                            bgcolor: res.senderRole === 'faculty' ? 'primary.light' : '#490597ff',
                            maxWidth: '80%',
                        }}
                    >
                        <Typography variant="caption" fontWeight={600} color="text.secondary">
                            {res.senderRole === 'faculty' ? 'Faculty' : 'Student'} ({new Date(res.createdAt).toLocaleTimeString()})
                        </Typography>
                        <Typography variant="body1">{res.text}</Typography>
                    </Box>
                ))
            )}
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        {/* Input area */}
        {showInput && (
            <Box>
                <TextField
                    multiline
                    fullWidth
                    minRows={3}
                    placeholder={isFaculty ? "Write your resolution or follow-up questions here..." : "Reply to the faculty..."}
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                    disabled={loading}
                    sx={{ mb: 1 }}
                />
                <Button
                    variant="contained"
                    onClick={handleSubmitResolution}
                    disabled={loading || !resolutionText.trim()}
                >
                    {loading ? <CircularProgress size={20} color="inherit" /> : `Send ${isFaculty ? 'Resolution' : 'Reply'}`}
                </Button>
            </Box>
        )}
        
        {isDoubtResolved && (
            <Alert severity="success">This doubt has been marked as RESOLVED.</Alert>
        )}

      </DialogContent>
      <DialogActions>
        {isFaculty && doubt?.status === 'accepted' && ( // Only show Mark Resolved if accepted
            <Button onClick={markAsResolved} color="success" variant="outlined" disabled={loading}>
                Mark as Resolved (Final/Offline)
            </Button>
        )}
        <Button onClick={onClose} color="error">Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DoubtResolutionDialog;