// src/components/AcceptChoiceDialog.jsx
import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

const AcceptChoiceDialog = ({ open, onClose, onChooseOnline, onChooseOffline, doubt }) => {
    // Safely isolate the string content regardless of field names
    const doubtText = doubt?.description || doubt?.doubt || "";

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>Resolve Doubt: {doubt?.subject || "Academic Query"}</DialogTitle>
            <DialogContent dividers>
                <Typography variant="h6" gutterBottom>
                    How would you like to handle this doubt?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    "{doubtText.length > 80 ? `${doubtText.substring(0, 80)}...` : doubtText}"
                </Typography>
            </DialogContent>
            <DialogActions sx={{ p: 2, justifyContent: 'space-around' }}>
                <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={onChooseOnline}
                    sx={{ flex: 1, mr: 1 }}
                >
                    Resolve Online (Chat)
                </Button>
                <Button 
                    variant="outlined" 
                    color="secondary" 
                    onClick={onChooseOffline}
                    sx={{ flex: 1 }}
                >
                    Offline Resolution (Schedule)
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AcceptChoiceDialog;