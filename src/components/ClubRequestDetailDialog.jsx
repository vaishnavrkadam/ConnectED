import React, { useState } from 'react';
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
  Alert
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

const ClubRequestDetailDialog = ({ open, onClose, request, isFaculty }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!request) return null;

  const handleUpdateStatus = async (newStatus) => {
    setLoading(true);
    setError("");
    try {
      const updatePayload = { status: newStatus };
      
      if (newStatus === "approved") {
        updatePayload["coordinatorApproval"] = { status: "approved", updatedAt: new Date().toISOString() };
        // Simulating auto-dean approval or transitioning directly to approved state safely
        updatePayload.status = "approved"; 
      } else if (newStatus === "rejected") {
        updatePayload["coordinatorApproval"] = { status: "rejected", updatedAt: new Date().toISOString() };
        updatePayload.status = "rejected";
      }

      await updateDoc(doc(db, "club_requests", request.id), updatePayload);
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to update request status.");
    } finally {
      setLoading(false);
    }
  };

  const showActionButtons = isFaculty && request.status === "pending_coordinator";

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
              <Typography variant="caption" color="textSecondary" display="block">CLAIM SCOPE</Typography>
              <Typography variant="body2" fontWeight={600} color="secondary.main">{request.requestType?.toUpperCase()}</Typography>
            </Box>
          </Stack>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
          
          <Typography variant="subtitle2" fontWeight={700}>Participant Line Rows:</Typography>
          <TableContainer component={Paper} sx={{ bgcolor: 'rgba(0,0,0,0.2)', maxHeight: 180 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ "& th": { bgcolor: '#1e293b', color: 'white', borderBottom: '1px solid #334155' } }}>
                  <TableCell>USN</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell align="right">Points</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {request.participants?.map((p, idx) => (
                  <TableRow key={idx} sx={{ "& td": { color: '#cbd5e1', borderBottom: '1px solid rgba(255,255,255,0.04)' } }}>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{p.usn}</TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell align="right">{p.points || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {request.proofUrl && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="textSecondary" display="block" mb={1}>BOUND PROOF DOCUMENTATION FILE:</Typography>
              <Box component="img" src={request.proofUrl} sx={{ maxWidth: '100%', maxHeight: 200, borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)' }} />
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <Button onClick={onClose} variant="outlined" color="inherit" disabled={loading} sx={{ textTransform: 'none' }}>Close View</Button>
        {showActionButtons && (
          <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
            <Button startIcon={<CancelIcon />} variant="contained" color="error" disabled={loading} onClick={() => handleUpdateStatus("rejected")} sx={{ textTransform: 'none' }}>Reject</Button>
            <Button startIcon={<CheckCircleIcon />} variant="contained" color="success" disabled={loading} onClick={() => handleUpdateStatus("approved")} sx={{ textTransform: 'none' }}>Approve Claims</Button>
          </Stack>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ClubRequestDetailDialog;