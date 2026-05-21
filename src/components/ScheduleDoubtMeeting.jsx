import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack, Typography } from '@mui/material';

const ScheduleDoubtMeeting = ({ open, onClose, doubt, onScheduleFinalized }) => {
    const [day, setDay] = useState('');
    const [time, setTime] = useState('');
    const [location, setLocation] = useState('');

    const handleFinalize = () => {
        if (!day || !time) {
            alert("Please provide the day and time.");
            return;
        }
        onScheduleFinalized({ day, time, location: location || 'Faculty Office' });
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Schedule Offline Meeting</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Doubt: "{doubt?.doubt.substring(0, 50)}..."
                </Typography>
                <Stack spacing={2}>
                    <TextField 
                        label="Meeting Day (e.g., Monday, 25th Oct)" 
                        value={day} 
                        onChange={(e) => setDay(e.target.value)} 
                        required 
                    />
                    <TextField 
                        label="Meeting Time (e.g., 2:00 PM)" 
                        value={time} 
                        onChange={(e) => setTime(e.target.value)} 
                        required 
                    />
                    <TextField 
                        label="Location (e.g., Office 205)" 
                        value={location} 
                        onChange={(e) => setLocation(e.target.value)} 
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="error" variant="outlined">Cancel</Button>
                <Button onClick={handleFinalize} color="primary" variant="contained" disabled={!day || !time}>
                    Confirm Schedule
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ScheduleDoubtMeeting;