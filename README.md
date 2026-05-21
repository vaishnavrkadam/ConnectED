# Faculty Doubt Portal

A React + Vite web application that acts as a faculty doubt portal, allowing students to check faculty availability and schedule doubt meetings.

## Local Setup & Configuration

Follow these steps to set up the project locally:

### 1. Install Dependencies
Make sure you have Node.js installed, then run:
```bash
npm install
```

### 2. Configure Environment Variables
Copy the `.env.example` file to create a `.env` file:
```bash
cp .env.example .env
```
Open the `.env` file and populate it with your Firebase project configurations:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

*Note: The `.env` file is excluded from git tracking via `.gitignore` to keep your credentials safe.*

### 3. Setup Firebase Admin SDK (Optional)
If you want to run the python availability schedule parser (`parse_faculty_schedule.py`), you need to:
1. Download a service account private key JSON file from the Firebase Console (Project Settings -> Service Accounts).
2. Save it in the project root directory as `serviceAccountKey.json`.

*Note: The `serviceAccountKey.json` contains critical private keys and is also ignored by Git for security.*

---

## Running the Application

### Development Server
To start the local development server:
```bash
npm run dev
```

### Production Build
To build the application for production:
```bash
npm run build
```

---

## Running the Faculty Availability Parser (Python)

If you have an updated schedule in `Faculty Schedule.xlsx` and want to parse and upload it to Firestore:

1. Install Python dependencies:
   ```bash
   pip install pandas openpyxl firebase-admin
   ```
2. Make sure `serviceAccountKey.json` is present in the root folder.
3. Run the script:
   ```bash
   python parse_faculty_schedule.py
   ```

---

## Uploading to GitHub

To upload this project to your GitHub account:

1. Go to [GitHub](https://github.com) and create a new repository.
2. Run the following commands in your terminal:

```bash
# Add all files to staging (Git will automatically ignore env and secret files)
git add .

# Create the initial commit
git commit -m "Initial commit: Set up project structure and secure API keys"

# Set the default branch to main
git branch -M main

# Link to your remote GitHub repository (replace with your repository URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push the changes to GitHub
git push -u origin main
```
