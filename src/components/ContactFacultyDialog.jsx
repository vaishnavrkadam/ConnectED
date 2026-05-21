import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  IconButton,
  Alert
} from "@mui/material";
import CallIcon from "@mui/icons-material/Call";
import EmailIcon from "@mui/icons-material/Email";

import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

const ContactFacultyDialog = ({ open, onClose }) => {
  const [allFaculties, setAllFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ---------- FETCH FACULTY ---------- */
  const fetchFaculties = async () => {
    setLoading(true);
    setError(null);

    try {
      const facultyQuery = query(
        collection(db, "users"),
        where("role", "==", "faculty")
      );

      const snapshot = await getDocs(facultyQuery);

      const list = [];
      const deptSet = new Set();

      snapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };
        list.push(data);
        if (data.department) deptSet.add(data.department);
      });

      setAllFaculties(list);
      setDepartments(["All", ...Array.from(deptSet).sort()]);
    } catch (e) {
      console.error("Error fetching faculty contacts:", e);
      setError("Failed to load faculty list. Please try again.");
      setAllFaculties([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchFaculties();
      setSelectedDepartment("All");
    }
  }, [open]);

  /* ---------- FILTER ---------- */
  const filteredFaculties = allFaculties.filter((faculty) => {
    if (selectedDepartment === "All") return true;
    return faculty.department === selectedDepartment;
  });

  /* ---------- ACTIONS ---------- */
  const handleCall = () => {
    window.location.href = "tel:8496950150";
  };

    const handleEmail = () => {
        window.location.href = "mailto:example@email.com";
    };


  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      scroll="paper"
    >
      <DialogTitle>Contact Other Faculties</DialogTitle>

      <DialogContent dividers sx={{ maxHeight: "70vh" }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Filter */}
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel id="department-select-label">
            Filter by Department
          </InputLabel>
          <Select
            labelId="department-select-label"
            value={selectedDepartment}
            label="Filter by Department"
            onChange={(e) => setSelectedDepartment(e.target.value)}
          >
            {departments.map((dept) => (
              <MenuItem key={dept} value={dept}>
                {dept}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Content */}
        {loading ? (
          <Box textAlign="center" mt={3}>
            <CircularProgress />
          </Box>
        ) : filteredFaculties.length === 0 ? (
          <Alert severity="warning">
            No faculty found for the selected department.
          </Alert>
        ) : (
          <Stack spacing={2}>
            {filteredFaculties.map((faculty) => (
              <Card
                key={faculty.id}
                variant="outlined"
                sx={{
                  bgcolor: "#1a1a2e",
                  borderColor: "#444"
                }}
              >
                <CardContent
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    p: 2,
                    minHeight: 72
                  }}
                >
                  <Box>
                    <Typography
                      variant="body1"
                      fontWeight={600}
                      color="primary.main"
                    >
                      {faculty.name || faculty.email}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#ccc" }}>
                      {faculty.department || "General Department"}
                    </Typography>
                  </Box>

                  <Box>
                    <IconButton color="primary" onClick={handleCall}>
                      <CallIcon />
                    </IconButton>

                    <IconButton
                      color="secondary"
                      onClick={handleEmail}
                    >
                      <EmailIcon />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="error" variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ContactFacultyDialog;
