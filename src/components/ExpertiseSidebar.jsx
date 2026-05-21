import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, List, ListItemButton, Collapse, 
    Divider, Chip, Stack, Card, CardContent, CircularProgress, Alert, Button
} from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

// Assumes FindFacultyDialog.jsx handles opening the appointment booking process
import FindFacultyDialog from './FindFacultyDialog'; 

const ExpertiseSidebar = () => {
    const [expertiseData, setExpertiseData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [openTag, setOpenTag] = useState(null);
    const [facultyToBook, setFacultyToBook] = useState(null); // Faculty for booking dialog

    // Fetch all faculty and group by expertise (Logic remains the same)
    const fetchExpertise = async () => {
        setLoading(true);
        setError(null);
        try {
            const facultyQuery = query(collection(db, 'users'), where('role', '==', 'faculty'));
            const snapshot = await getDocs(facultyQuery);

            const data = {};
            snapshot.forEach(doc => {
                const f = { id: doc.id, ...doc.data() };
                (f.expertise || []).forEach(tag => {
                    const cleanTag = tag.trim().toUpperCase();
                    if (!data[cleanTag]) {
                        data[cleanTag] = [];
                    }
                    data[cleanTag].push(f);
                });
            });
            setExpertiseData(data);
        } catch (e) {
            console.error("Error fetching expertise data:", e);
            setError("Failed to load faculty expertise data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExpertise();
    }, []);

    const handleTagClick = (tag) => {
        setOpenTag(openTag === tag ? null : tag);
    };

    const handleFacultySelect = (faculty) => {
        // Correctly sets state to trigger the FindFacultyDialog modal with the faculty details
        setFacultyToBook(faculty);
    };
    
    const handleCloseBooking = () => {
        setFacultyToBook(null);
    };

    // FIX: Wrapping both the Box and the Dialog in a React Fragment (<>) to satisfy syntax rules.
    return (
        <>
        <Box 
            sx={{ 
                width: 400, 
                // Setting dark background to match the theme
                bgcolor: '#050816', 
                borderRight: '1px solid #ddd',
                height: 'calc(100vh - 64px)', 
                overflowY: 'auto',
                p: 2,
                flexShrink: 0,
                
                // Hide the default white scrollbar. 
                '&::-webkit-scrollbar': {
                    width: '0.4em'
                },
                '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'transparent',
                },
            }}
        >
            <Typography variant="h6" fontWeight={700} color="primary.dark" gutterBottom>
                Expertise Explorer
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Find faculty by their specialized subject tags.
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {loading ? (
                <Box textAlign="center"><CircularProgress size={24} /></Box>
            ) : error ? (
                <Alert severity="error">{error}</Alert>
            ) : (
                <List component="nav" sx={{ p: 0 }}>
                    {Object.keys(expertiseData).sort().map((tag) => (
                        <Box key={tag}>
                            <ListItemButton onClick={() => handleTagClick(tag)} sx={{ p: 1, borderBottom: '1px solid #ddd' }}>
                                <Chip label={tag} size="small" color="primary" sx={{ mr: 1 }} />
                                <Typography variant="caption" fontWeight={600} color="text.primary">({expertiseData[tag].length} experts)</Typography> 
                                {openTag === tag ? <ExpandLess sx={{ ml: 'auto', color: 'text.primary' }} /> : <ExpandMore sx={{ ml: 'auto', color: 'text.primary' }} />}
                            </ListItemButton>
                            
                            <Collapse in={openTag === tag} timeout="auto" unmountOnExit>
                                <List component="div" disablePadding sx={{ bgcolor: '#050816' }}> 
                                    {expertiseData[tag].map((faculty) => (
                                        <Card key={faculty.id} variant="outlined" sx={{ m: 1, bgcolor: '#1a1a2e' }}>
                                            <CardContent sx={{ p: 1.5 }}>
                                                <Stack direction="column" spacing={0.5}>
                                                    <Typography variant="body1" fontWeight={700} color="text.primary">
                                                        {faculty.name || faculty.email}
                                                    </Typography>
                                                    
                                                    {faculty.aboutMe && (
                                                        <Typography variant="caption" color="text.secondary"> 
                                                            {faculty.aboutMe.substring(0, 100)}{faculty.aboutMe.length > 100 ? '...' : ''}
                                                        </Typography>
                                                    )}
                                                    
                                                    <Button 
                                                        size="small" 
                                                        variant="text" 
                                                        color="secondary"
                                                        sx={{ fontSize: '0.7rem', p: 0.5, mt: 1, alignSelf: 'flex-end' }}
                                                        onClick={() => handleFacultySelect(faculty)} 
                                                    >
                                                        Book Appointment
                                                    </Button>
                                                </Stack>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </List>
                            </Collapse>
                        </Box>
                    ))}
                </List>
            )}
        </Box>
        {/* FindFacultyDialog is conditionally rendered here with the faculty data */}
        {facultyToBook && (
            <FindFacultyDialog
                open={!!facultyToBook}
                onClose={handleCloseBooking}
                initialFaculty={facultyToBook} 
            />
        )}
        </>
    );
};

export default ExpertiseSidebar;