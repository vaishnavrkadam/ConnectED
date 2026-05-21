
import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  MenuItem,
  Alert
} from "@mui/material";
import { auth, db } from "../firebase";
import { addDoc, collection } from "firebase/firestore";


/* ===== CONFIG ===== */
const DAYS = ["MON", "TUE", "WED", "THU", "FRI"];
const WORK_START = 9;
const WORK_END = 17;
const SLOT_MINUTES = 30;

/* ===== HELPERS ===== */
const generateTimeSlots = () => {
  const slots = [];
  for (let h = WORK_START; h < WORK_END; h++) {
    for (let m = 0; m < 60; m += SLOT_MINUTES) {
      const start = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const endM = m + SLOT_MINUTES;
      const endH = endM === 60 ? h + 1 : h;
      const end = `${String(endH).padStart(2, "0")}:${String(endM === 60 ? 0 : endM).padStart(2, "0")}`;
      slots.push({ start, end });
    }
  }
  return slots;
};

const safeOverlap = (a, b) => {
  if (!a || !b) return false;
  if (!a.start || !a.end || !b.start || !b.end) return false;
  return a.start < b.end && a.end > b.start;
};

/* ===== COMPONENT ===== */
const FacultyCard = ({ faculty, availability = {} }) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [day, setDay] = useState("");
  const [slot, setSlot] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const timeSlots = useMemo(() => generateTimeSlots(), []);

  const busySlotsForDay = React.useMemo(() => {
    if (!day || !availability.busySlots) return [];

    const raw = availability.busySlots[day];
    if (!raw) return [];

    // Firestore stores it as an object with numeric keys
    // Convert it to array
    return Array.isArray(raw) ? raw : Object.values(raw);
  }, [day, availability.busySlots]);


  const isSlotAvailable = (s) => {
    for (const b of busySlotsForDay) {
      if (safeOverlap(s, b)) return false;
    }
    return true;
  };

  const handleBook = async () => {
    setError("");
    if (!day || !slot || !reason.trim()) {
      setError("Please select day, time and enter reason.");
      return;
    }

    const [start, end] = slot.split(" - ");
    const selected = { start, end };

    if (!isSlotAvailable(selected)) {
      setError("Faculty is busy at the selected time.");
      return;
    }

    setLoading(true);
    try {
      const u = auth.currentUser;
      await addDoc(collection(db, "appointments"), {
        studentId: u.uid,
        studentEmail: u.email,
        facultyId: faculty.id,
        facultyName: faculty.name,
        department: faculty.department,
        reason,
        slot: { day, start, end },
        status: "pending",
        createdAt: new Date().toISOString()
      });
      setOpen(false);
      setDay("");
      setSlot("");
      setReason("");
    } catch {
      setError("Failed to book appointment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card onClick={() => setOpen(true)} sx={{ cursor: "pointer" }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="h6">{faculty.name}</Typography>
            <Chip
              label={availability.busy ? "Busy" : "Available"}
              color={availability.busy ? "error" : "success"}
            />
          </Stack>
          <Typography variant="body2">{faculty.department}</Typography>
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
        <DialogTitle>Book Appointment</DialogTitle>
        <DialogContent>
          <TextField
            select
            label="Day"
            fullWidth
            value={day}
            onChange={(e) => {
              setDay(e.target.value);
              setSlot("");
            }}
            sx={{ mb: 2 }}
          >
            {DAYS.map((d) => (
              <MenuItem key={d} value={d}>{d}</MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Time Slot"
            fullWidth
            disabled={!day}
            value={slot}
            onChange={(e) => setSlot(e.target.value)}
            sx={{ mb: 2 }}
          >
            {timeSlots.map((s) => {
              const available = isSlotAvailable(s);
              return (
                <MenuItem
                  key={`${s.start}-${s.end}`}
                  value={`${s.start} - ${s.end}`}
                  disabled={!available}
                >
                  {s.start} – {s.end} {!available ? "(Busy)" : ""}
                </MenuItem>
              );
            })}
          </TextField>

          <TextField
            label="Reason"
            multiline
            minRows={3}
            fullWidth
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            sx={{ mb: 2 }}
          />

          {error && <Alert severity="error">{error}</Alert>}

          <Button
            variant="contained"
            fullWidth
            onClick={handleBook}
            disabled={loading}
          >
            {loading ? "Sending..." : "Book Appointment"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FacultyCard;
