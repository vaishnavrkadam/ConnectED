import pandas as pd
import re
from firebase_admin import credentials, firestore, initialize_app

# ---------------- CONFIG ----------------
EXCEL_FILE = "Faculty Schedule.xlsx"
SERVICE_KEY = "serviceAccountKey.json"
COLLECTION = "faculty_availability"

# ---------------- INIT FIREBASE ----------------
cred = credentials.Certificate(SERVICE_KEY)
initialize_app(cred)
db = firestore.client()

# ---------------- HELPERS ----------------
def normalize_day(day):
    day = day.strip().upper()
    return {
        "MON": "MON", "TUE": "TUE", "WED": "WED",
        "THU": "THU", "FRI": "FRI", "SAT": "SAT"
    }.get(day[:3], None)

def parse_days(days_raw):
    # Remove section prefixes like "ECE-A:"
    days_raw = re.sub(r"[A-Z\-]+:", "", str(days_raw))
    tokens = re.split(r"[,/]", days_raw)
    days = set()
    for t in tokens:
        d = normalize_day(t)
        if d:
            days.add(d)
    return list(days)

def parse_time_slots(slots_raw):
    slots_raw = re.sub(r"\(.*?\)", "", str(slots_raw))  # remove (LAB), (T)
    parts = re.split(r"[,&]", slots_raw)
    slots = set()

    for p in parts:
        p = p.strip()
        if "-" in p:
            start, end = p.split("-")
            start = start.replace(".", ":").zfill(5)
            end = end.replace(".", ":").zfill(5)
            slots.add((start, end))

    return list(slots)

# ---------------- READ EXCEL ----------------
df = pd.read_excel(EXCEL_FILE)

for _, row in df.iterrows():
    faculty = str(row["Faculty Name"]).strip()
    department = str(row["Branch/Section"]).strip()
    course = str(row["Course Code"]).strip()

    days = parse_days(row["Day(s)"])
    slots = parse_time_slots(row["Time Slots"])

    if not days or not slots:
        continue

    busy = {}

    for day in days:
        busy.setdefault(day, [])
        for start, end in slots:
            busy[day].append({
                "start": start,
                "end": end,
                "desc": f"{course} - {department}"
            })

    # Deduplicate slots
    for day in busy:
        unique = { (s["start"], s["end"]): s for s in busy[day] }
        busy[day] = list(unique.values())

    # Push to Firestore
    db.collection(COLLECTION).document(faculty).set({
        "facultyName": faculty,
        "department": department,
        "busySlots": busy
    })

print("✅ Faculty availability successfully uploaded.")
