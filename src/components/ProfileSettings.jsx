import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Chip, Stack, Box, Typography, Alert } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

const ProfileSettings = ({ open, onClose }) => {
    const { user, profile } = useAuth();
    
    // Convert array of strings to a single, comma-separated string for editing
    const [expertiseString, setExpertiseString] = useState(profile?.expertise?.join(', ') || '');
    const [aboutMe, setAboutMe] = useState(profile?.aboutMe || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);
        setError(null);

        try {
            // Convert comma-separated string back to an array, trim spaces
            const newExpertiseArray = expertiseString
                .split(',')
                .map(item => item.trim().toUpperCase())
                .filter(item => item.length > 0);

            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                expertise: newExpertiseArray,
                aboutMe: aboutMe.trim(),
            });

            alert('Profile settings updated successfully!');
            onClose();

        } catch (e) {
            setError('Failed to save profile. Please check your input.');
            console.error('Profile update error:', e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Update Faculty Profile & Expertise</DialogTitle>
            <DialogContent dividers>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                
                <Stack spacing={3}>
                    <TextField
                        label="About Me / Professional Focus"
                        multiline
                        rows={3}
                        value={aboutMe}
                        onChange={(e) => setAboutMe(e.target.value)}
                        helperText="A short description of your areas of research or teaching focus for students to see."
                    />

                    <TextField
                        label="Expertise Keywords"
                        value={expertiseString}
                        onChange={(e) => setExpertiseString(e.target.value)}
                        helperText="Enter keywords separated by commas (e.g., JAVA, DATABASES, AI, MACHINE LEARNING)"
                        fullWidth
                    />
                    
                    <Box>
                        <Typography variant="subtitle2" gutterBottom>Current Keywords:</Typography>
                        {profile?.expertise?.map((exp, index) => (
                            <Chip key={index} label={exp} sx={{ mr: 1, mb: 1 }} color="primary" variant="outlined" size="small" />
                        ))}
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="outlined" disabled={loading}>Cancel</Button>
                <Button onClick={handleSave} variant="contained" color="primary" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ProfileSettings;