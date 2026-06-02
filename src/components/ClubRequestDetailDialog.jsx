import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
  Box,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  TextField
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { db } from '../firebase';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

// src/components/ClubRequestDetailDialog.jsx - Status Modifier Modification
const ClubRequestDetailDialog = ({ open, onClose, request, isFaculty, isDeanView }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editableParticipants, setEditableParticipants] = useState([]);

  useEffect(() => {
    if (request?.participants) {
      setEditableParticipants(JSON.parse(JSON.stringify(request.participants)));
    }
  }, [request]);

  if (!request) return null;

  const handlePointsChange = (index, value) => {
    const updated = [...editableParticipants];
    updated[index].points = value;
    setEditableParticipants(updated);
  };

  const handleUpdateStatus = async (actionType) => {
    setLoading(true);
    setError("");
    try {
      const requestDocRef = doc(db, "club_requests", request.id);
      
      if (actionType === "reject") {
        await updateDoc(requestDocRef, {
          status: "rejected",
          [isDeanView ? "deanApproval.status" : "coordinatorApproval.status"]: "rejected",
          [isDeanView ? "deanApproval.updatedAt" : "coordinatorApproval.updatedAt"]: new Date().toISOString()
        });
        onClose();
        return;
      }

      // If the current reviewer is the Dean, final clearance criteria is reached
      if (isDeanView || request.status === "pending_dean") {
        await updateDoc(requestDocRef, {
          status: "approved", // Triggers dynamic point compilation engine on Student Overviews instantly
          participants: editableParticipants,
          "deanApproval.status": "approved",
          "deanApproval.updatedAt": new Date().toISOString()
        });
      } else {
        // Fallback context routing behavior matching standard Coordinator flows
        await updateDoc(requestDocRef, {
          status: "pending_dean",
          participants: editableParticipants,
          "coordinatorApproval.status": "approved",
          "coordinatorApproval.updatedAt": new Date().toISOString()
        });
      }

      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to update status parameters.");
    } finally {
      setLoading(false);
    }
  };

  // Determine button state visibility criteria
  const showActionControls = isFaculty && (request.status === "pending_coordinator" || (isDeanView && request.status === "pending_dean"));

  // ... (Keep existing layout return templates, tables, and buttons exactly identical)

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { bgcolor: '#0f172a', color: 'white', borderRadius: 4 } }}>
      <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={700}>{request.eventName}</Typography>
        <Chip label={request.status.replace("_", " ").toUpperCase()} color={request.status === "approved" ? "success" : (request.status === "rejected" ? "error" : "info")} size="small" />
      </DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="caption" color="textSecondary" display="block">CLUB ORIGIN</Typography>
            <Typography variant="body1" fontWeight={600}>{request.clubName}</Typography>
          </Box>

          <Stack direction="row" spacing={4}>
            <Box>
              <Typography variant="caption" color="textSecondary" display="block">FROM DATE</Typography>
              <Typography variant="body2" fontWeight={600}>{request.fromDate}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="textSecondary" display="block">TO DATE</Typography>
              <Typography variant="body2" fontWeight={600}>{request.toDate}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="textSecondary" display="block">CLAIM CATEGORY</Typography>
              <Typography variant="body2" fontWeight={600} color="secondary.main">{request.requestType?.toUpperCase()}</Typography>
            </Box>
          </Stack>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
          
          <Typography variant="subtitle2" fontWeight={700}>
            {showActionControls ? "Review & Adjust Activity Points Row Entry:" : "Participant Line Rows:"}
          </Typography>

          <TableContainer component={Paper} sx={{ bgcolor: 'rgba(0,0,0,0.2)', maxHeight: 200 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ "& th": { bgcolor: '#1e293b', color: 'white', borderBottom: '1px solid #334155' } }}>
                  <TableCell>USN</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell align="right" sx={{ pr: 3 }}>Points</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {editableParticipants.map((p, idx) => (
                  <TableRow key={idx} sx={{ "& td": { color: '#cbd5e1', borderBottom: '1px solid rgba(255,255,255,0.04)' } }}>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{p.usn}</TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell align="right">
                      {showActionControls && request.requestType !== "attendance" ? (
                        <TextField
                          type="number"
                          size="small"
                          value={p.points}
                          onChange={(e) => handlePointsChange(idx, e.target.value)}
                          inputProps={{ style: { color: 'white', textAlign: 'right', padding: '4px 8px' } }}
                          sx={{
                            width: 80,
                            '& .MuiOutlinedInput-root': {
                              bgcolor: 'rgba(255,255,255,0.05)',
                              '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' }
                            }
                          }}
                        />
                      ) : (
                        <Typography variant="body2" sx={{ pr: 2 }}>{p.points || "-"}</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {request.proofUrl && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 1 }}>
                BOUND PROOF DOCUMENTATION FILE:
              </Typography>
              <Box 
                component="img" 
                // Supports base64 data strings and direct web hyperlink strings natively
                src={request.proofUrl.startsWith("http") || request.proofUrl.startsWith("data:") ? request.proofUrl : null} 
                sx={{ 
                  width: '100%', 
                  maxHeight: '60vh', 
                  borderRadius: 2, 
                  objectFit: 'contain',
                  bgcolor: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255,255,255,0.08)' 
                }} 
              />
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <Button onClick={onClose} variant="outlined" color="inherit" disabled={loading} sx={{ textTransform: 'none' }}>Close View</Button>
        {showActionControls && (
          <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
            <Button startIcon={<CancelIcon />} variant="contained" color="error" disabled={loading} onClick={() => handleUpdateStatus("reject")} sx={{ textTransform: 'none' }}>Reject Request</Button>
            <Button startIcon={<CheckCircleIcon />} variant="contained" color="success" disabled={loading} onClick={() => handleUpdateStatus("approve")} sx={{ textTransform: 'none' }}>Approve & Route to Dean</Button>
          </Stack>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ClubRequestDetailDialog;