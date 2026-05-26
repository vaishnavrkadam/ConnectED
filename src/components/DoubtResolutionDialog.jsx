import React, { useState, useEffect, useRef } from 'react';
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
  IconButton,
  Paper
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  updateDoc, 
  query, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const DoubtResolutionDialog = ({ open, onClose, doubt, isFaculty }) => {
  const { user } = useAuth();
  const [resolutionText, setResolutionText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [responses, setResponses] = useState([]);
  
  // Confirmation state prompt overlay
  const [showConfirmResolve, setShowConfirmResolve] = useState(false);
  
  const messagesEndRef = useRef(null);

  // Scroll smoothly to the lowest chat bubble on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (open && doubt?.id) {
        setResolutionText('');
        setError(null);
        setShowConfirmResolve(false);
        
        // Listen to the live chat transcript sub-collection channel real-time
        const responsesRef = collection(db, 'doubts', doubt.id, 'responses');
        const q = query(responsesRef, orderBy('createdAt', 'asc'));
        
        const unsub = onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
            setResponses(list);
            setTimeout(scrollToBottom, 100);
        }, (err) => {
            console.error("Transcript streaming failure:", err);
            setError("Could not load chat channel history.");
        });
        
        return () => unsub();
    }
  }, [open, doubt]);

  useEffect(() => {
    if (responses.length > 0) {
      scrollToBottom();
    }
  }, [responses]);

  // Sending message transcripts logic
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!resolutionText.trim() || doubt?.status === 'resolved') return;

    setLoading(true);
    try {
      const responseData = {
        senderId: user.uid,
        senderEmail: user.email,
        senderRole: isFaculty ? 'faculty' : 'student',
        text: resolutionText.trim(),
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'doubts', doubt.id, 'responses'), responseData);
      setResolutionText('');
      
      // Auto upgrade state to 'accepted' if a professor responds to open a bilateral stream
      if (isFaculty && doubt.status === 'assigned') {
          await updateDoc(doc(db, 'doubts', doubt.id), { status: 'accepted' });
      }
    } catch (e) {
      setError('Failed to transmit chat bubble packet.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Handles the custom Close interaction prompt trigger
  const handleCloseAttempt = () => {
    if (doubt?.status === 'resolved') {
      onClose(); // If already locked, close immediately without prompting
    } else {
      setShowConfirmResolve(true);
    }
  };

  // Handles confirmation selection
  const handleResolveFeedback = async (isResolvedByMe) => {
    setShowConfirmResolve(false);
    if (!isResolvedByMe) {
      onClose(); // Just exit if they select "No"
      return;
    }

    try {
      const currentResolvedFlags = doubt?.resolvedFlags || { student: false, faculty: false };
      const updatedFlags = {
        ...currentResolvedFlags,
        [isFaculty ? 'faculty' : 'student']: true
      };

      const patchData = { resolvedFlags: updatedFlags };

      // If BOTH parties have checked "Yes", lock the query permanently
      if (updatedFlags.student && updatedFlags.faculty) {
        patchData.status = 'resolved';
        patchData.resolvedAt = new Date().toISOString();
      } else {
        // If only one checked yes, keep it active but mark it as 'accepted'
        patchData.status = 'accepted'; 
      }

      await updateDoc(doc(db, 'doubts', doubt.id), patchData);
      onClose();
    } catch (err) {
      console.error("Failed to commit status conversion flag:", err);
      onClose();
    }
  };

  const isDoubtResolved = doubt?.status === 'resolved';

  return (
    <>
      <Dialog open={open && !showConfirmResolve} onClose={handleCloseAttempt} fullWidth maxWidth="sm"
        PaperProps={{
          sx: { bgcolor: '#0f172a', color: '#e5e7eb', borderRadius: 4, height: '80vh' }
        }}
      >
        {/* Header Metadata Ribbon Section */}
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ color: '#c0c1ff', textTransform: 'capitalize' }}>
              {doubt?.subject || "Academic Doubt Thread"}
            </Typography>
            <Typography variant="caption" sx={{ color: '#9ca3af' }}>
              {isFaculty ? `Student: ${doubt?.studentName || doubt?.studentEmail}` : `Faculty: ${doubt?.assignedFacultyName}`}
            </Typography>
          </Box>
          <Chip 
            label={doubt?.status?.toUpperCase()} 
            size="small" 
            color={isDoubtResolved ? 'success' : 'secondary'} 
            sx={{ fontWeight: 800, fontSize: '0.7rem' }}
          />
        </Box>

        {/* Initial Stated Query Blueprint Prompt */}
        <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <Typography variant="caption" sx={{ color: '#ec4899', fontWeight: 700, block: 'true', mb: 0.5 }}>ORIGINAL QUERY:</Typography>
          <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#e5e7eb' }}>
            "{doubt?.description || doubt?.doubt}"
          </Typography>
        </Box>

        {/* Scrollable Transcript Module Window */}
        <DialogContent sx={{ 
          p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, bgcolor: '#050816', overflowY: 'auto',
          '&::-webkit-scrollbar': { width: '0.4em' },
          '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2 }
        }}>
          {responses.map((res) => {
            const isMyMessage = res.senderId === user.uid;
            return (
              <Box key={res.id} sx={{ display: 'flex', justifyContent: isMyMessage ? 'flex-end' : 'flex-start', width: '100%' }}>
                <Paper elevation={0} sx={{
                  p: 1.5, maxWidth: '75%', borderRadius: 3,
                  borderTopRightRadius: isMyMessage ? 1 : 12,
                  borderTopLeftRadius: isMyMessage ? 12 : 1,
                  bgcolor: isMyMessage ? '#4f46e5' : 'rgba(255,255,255,0.08)',
                  color: '#e5e7eb'
                }}>
                  <Typography variant="body2" sx={{ wordBreak: 'break-word', lineHeight: 1.4 }}>
                    {res.text}
                  </Typography>
                </Paper>
              </Box>
            );
          })}
          <div ref={messagesEndRef} />
        </DialogContent>

        {error && <Alert severity="error" sx={{ square: true }}>{error}</Alert>}

        {/* Instastyle Action Submission Footer Component */}
        <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.08)', bgcolor: '#0f172a' }}>
          {isDoubtResolved ? (
            <Alert severity="success" icon={<CheckCircleIcon />} sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)', color: '#4caf50', border: '1px solid rgba(76,175,80,0.2)' }}>
              This query has been marked as RESOLVED. Thread has been locked.
            </Alert>
          ) : (
            <Box component="form" onSubmit={handleSendMessage} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                variant="outlined"
                placeholder="Type a message..."
                value={resolutionText}
                onChange={(e) => setResolutionText(e.target.value)}
                disabled={loading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: 'white', bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 6,
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' }
                  }
                }}
              />
              <IconButton type="submit" color="secondary" disabled={loading || !resolutionText.trim()} sx={{ bgcolor: '#ec4899', color: 'white', '&:hover': { bgcolor: '#c2185b' }, p: 1 }}>
                <SendIcon sx={{ fontSize: 18 }} />
              </IconButton>
              <Button variant="outlined" color="error" size="small" onClick={handleCloseAttempt} sx={{ textTransform: 'none', borderRadius: 4, ml: 1, px: 2 }}>
                Close
              </Button>
            </Box>
          )}
        </Box>
      </Dialog>

      {/* Real-time Confirmation Prompt Modal Overlay */}
      <Dialog open={showConfirmResolve} onClose={() => handleResolveFeedback(false)}
        PaperProps={{
          sx: { bgcolor: '#1e2022', color: 'white', borderRadius: 4, p: 2, textAlign: 'center', maxWidth: 380 }
        }}
      >
        <DialogContent>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Is this doubt resolved?
          </Typography>
          <Typography variant="body2" sx={{ color: '#9ca3af', mb: 2 }}>
            If both you and the other party select yes, this doubt thread will be permanently closed and locked.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-around', pb: 2 }}>
          <Button variant="contained" color="success" onClick={() => handleResolveFeedback(true)} sx={{ borderRadius: 3, px: 4, textTransform: 'none' }}>
            Yes, Resolved
          </Button>
          <Button variant="outlined" color="error" onClick={() => handleResolveFeedback(false)} sx={{ borderRadius: 3, px: 4, textTransform: 'none' }}>
            Not Yet
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DoubtResolutionDialog;