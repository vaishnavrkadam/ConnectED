import React, { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  TextField,
  MenuItem,
  Stack,
  Divider,
  CircularProgress
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FacultyCard from "./FacultyCard";

import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";

/* ---------- TIME HELPERS (Unchanged) ---------- */
const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const isBusyNow = (busySlots) => {
  if (!busySlots) return { busy: false };

  const now = new Date();
  const today = dayNames[now.getDay()];
  const currentTime =
    now.getHours().toString().padStart(2, "0") +
    ":" +
    now.getMinutes().toString().padStart(2, "0");

  const todaySlots = busySlots[today];
  if (!todaySlots) return { busy: false };

  // Ensure 'todaySlots' is handled as an array
  const slotsArray = Array.isArray(todaySlots) ? todaySlots : Object.values(todaySlots);

  for (const slot of slotsArray) {
    if (currentTime >= slot.start && currentTime < slot.end) {
      return {
        busy: true,
        reason: slot.desc,
        until: slot.end
      };
    }
  }
  return { busy: false };
};

// ... (imports remain the same)

// ... (TIME HELPERS remain the same)

const FindFacultyDialog = ({ open, onClose }) => {
  const [faculty, setFaculty] = useState([]);
  const [availability, setAvailability] = useState({});
  const [loading, setLoading] = useState(true);

  // Filters: Faculty Department and Name Search
  const [department, setDepartment] = useState("");
  const [search, setSearch] = useState("");

  /* ---------- FETCH FACULTY AND AVAILABILITY ---------- */
  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      setLoading(true);

      // 1. Fetch ALL Faculty users from the 'users' collection
      const facSnap = await getDocs(
        query(collection(db, "users"), where("role", "==", "faculty"))
      );

      const facList = [];
      facSnap.forEach((d) =>
        facList.push({ id: d.id, ...d.data() }) // d.data() contains the 'department' field
      );

      // 2. Fetch Availability
      const availSnap = await getDocs(
        collection(db, "faculty_availability")
      );
      const availMap = {};
      availSnap.forEach((d) => {
        availMap[d.id] = d.data();
      });

      setFaculty(facList);
      setAvailability(availMap);
      setLoading(false);
    };

    fetchData();
  }, [open]);

  // List of all unique faculty departments fetched from the 'department' field of all 'users' documents
  const departments = useMemo(() => {
    return [
      ...new Set(faculty.map((f) => f.department).filter(Boolean)),
    ].sort();
  }, [faculty]); // Depend on the full faculty list

  // Filtering Logic: Uses Faculty Department and Name Search
  const filteredFaculty = faculty.filter((f) => {
    return (
      // 1. Department filter
      (!department || f.department === department) &&
      // 2. Name search filter
      (!search ||
        f.name.toLowerCase().includes(search.toLowerCase()))
    );
  });

  return (
    <Dialog fullScreen open={open} onClose={onClose}>
      {/* ... (AppBar remains the same) ... */}
      <AppBar position="sticky">
        <Toolbar>
          <Typography sx={{ flex: 1 }} variant="h6">
            Find Faculty
          </Typography>
          <IconButton color="inherit" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3 }}>
        {/* Filters: Stack with Department Dropdown and Search Field */}
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            select
            label="Faculty Department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">All Departments</MenuItem>
            {departments.map((dept) => (
              <MenuItem key={dept} value={dept}>
                {dept}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Search faculty name"
            fullWidth
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Stack>

        <Divider sx={{ my: 3 }} />

        {/* Faculty List */}
        {loading ? (
          <Box textAlign="center" mt={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={2}>
            {filteredFaculty.length === 0 ? (
              <Typography color="text.secondary">
                No faculty found matching your criteria.
              </Typography>
            ) : (
              filteredFaculty.map((f) => {
                const avail = availability[f.name];
                const status = {
                  ...isBusyNow(avail?.busySlots),
                  busySlots: avail?.busySlots || {},
                };

                status.busySlotsToday =
                  avail?.busySlots?.[dayNames[new Date().getDay()]] || [];

                return (
                  <FacultyCard
                    key={f.id}
                    faculty={f}
                    availability={{
                      ...status,
                      busySlots: avail?.busySlots || {},
                    }}
                  />
                );
              })
            )}
          </Stack>
        )}
      </Box>
    </Dialog>
  );
};

export default FindFacultyDialog;