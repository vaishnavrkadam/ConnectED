// src/components/ActionSuccessDialog.jsx
import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography, 
  Box 
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const ActionSuccessDialog = ({ open, handleClose, title, message }) => {
  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        style: {
          borderRadius: 16,
          padding: '10px',
          textAlign: 'center',
          backgroundColor: '#1e1e1e', // Dark mode background match
          color: '#ffffff',
          border: '1px solid #333'
        },
      }}
    >
      <DialogContent>
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          {/* Success Icon */}
          <CheckCircleOutlineIcon sx={{ fontSize: 60, color: '#4caf50' }} />
          
          {/* Title */}
          <Typography variant="h5" fontWeight="bold">
            {title}
          </Typography>

          {/* Message Body */}
          <Typography variant="body1" color="gray">
            {message}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'center', paddingBottom: 2 }}>
        <Button 
          onClick={handleClose} 
          variant="contained" 
          color="primary"
          sx={{ borderRadius: 20, px: 4, textTransform: 'none' }}
        >
          Awesome, Got it!
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ActionSuccessDialog;