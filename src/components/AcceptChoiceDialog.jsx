// src/components/AcceptChoiceDialog.jsx (New File)
import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Stack } from '@mui/material';

const AcceptChoiceDialog = ({ open, onClose, onChooseOnline, onChooseOffline, doubt }) => {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>Resolve Doubt: {doubt?.subject}</DialogTitle>
            <DialogContent dividers>
                <Typography variant="h6" gutterBottom>
                    How would you like to handle this doubt?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    "{doubt?.doubt.substring(0, 80)}..."
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