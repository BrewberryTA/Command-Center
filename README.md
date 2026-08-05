# ⌘ COMMAND CENTER

**Your personal productivity terminal.** A full-stack web app with tasks, Google Calendar integration, file attachments, a tools hotlink panel, and a Bloomberg-terminal aesthetic.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS + custom CSS variables |
| Auth | Firebase Auth (Google Sign-In) |
| Database | Firebase Firestore |
| File Storage | Firebase Storage |
| Calendar | Google Calendar API v3 |
| PDF Export | jsPDF |
| Deploy | Vercel or Firebase Hosting |

---

## Feature Overview

- **Dashboard** — today's tasks grouped by type, rolled-over items, export to PDF
- **Tasks** — master list with filters (type / priority / status / completion) and sorting
- **Calendar** — month view, Google Calendar OAuth link, event dots per day
- **Tools** — hotlink grid with auto-fetched favicons
- **Roll-Forward** — incomplete open tasks from prior business day automatically roll to today
- **Notes Log** — append-only per-task notes with timestamps
- **File Attachments** — upload .xlsx / .xls / .docx / .doc / .pdf, max 10 MB, stored in Firebase Storage
- **Keyboard Shortcuts** — `N` new task, `T` jump to today, `Esc` close modal

---

## Setup Guide

### Step 1 — Create a Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project**, name it (e.g. `command-center`)
3. Disable Google Analytics if not needed → **Create project**

---

### Step 2 — Enable Firebase Services

#### 2a. Authentication
1. In the Firebase Console, go to **Build → Authentication**
2. Click **Get started**
3. Under **Sign-in method**, enable **Google**
4. Set a support email → **Save**

#### 2b. Firestore Database
1. Go to **Build → Firestore Database**
2. Click **Create database**
3. Choose **Start in production mode** (security rules will be deployed separately)
4. Select a region closest to your users → **Done**

#### 2c. Storage
1. Go to **Build → Storage**
2. Click **Get started**
3. Choose **Start in production mode**
4. Select the same region as Firestore → **Done**

---

### Step 3 — Get Firebase Config Keys

1. In Firebase Console → **Project Settings** (gear icon, top left)
2. Scroll to **Your apps** → click **</>** (Web app)
3. Register the app with a nickname (e.g. "command-center-web")
4. Copy the `firebaseConfig` object — you'll need all 6 values

---

### Step 4 — Set Up Google Calendar API

> This step is optional. The app works fully without it — you just won't be able to link Google Calendars.

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Select the same Google Cloud project linked to your Firebase project  
   *(Firebase automatically creates a GCP project — find it by the same project ID)*
3. Go to **APIs & Services → Library**
4. Search for **Google Calendar API** → Enable it
5. Go to **APIs & Services → OAuth consent screen**
   - Choose **External** → Create
   - Fill in App name, support email, developer email
   - Add scope: `https://www.googleapis.com/auth/calendar.readonly`
   - Add your Google account as a test user (while in development)
   - Save
6. Go to **APIs & Services → Credentials**
7. Click **Create Credentials → OAuth 2.0 Client IDs**
   - Application type: **Web application**
   - Authorized JavaScript origins:
     - `http://localhost:5173` (Vite dev server)
     - Your production domain (e.g. `https://command-center.vercel.app`)
   - Authorized redirect URIs: same as above
   - Click **Create** → copy the **Client ID**
8. Also create an **API Key** (Credentials → Create Credentials → API Key)
   - Restrict it to the **Google Calendar API** and your domain

---

### Step 5 — Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in all values in `.env.local`:
   ```env
   VITE_FIREBASE_API_KEY=AIza...
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abc123

   VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   VITE_GOOGLE_API_KEY=AIza...
   ```

> `.env.local` is in `.gitignore` and will never be committed.

---

### Step 6 — Deploy Firestore Security Rules

```bash
# Install Firebase CLI (one-time)
npm install -g firebase-tools

# Login
firebase login

# Select your project
firebase use your-project-id

# Deploy rules
firebase deploy --only firestore:rules
firebase deploy --only storage
```

Or paste the contents of `firestore.rules` and `storage.rules` directly into the Firebase Console.

---

### Step 7 — Install Dependencies & Run Locally

```bash
# Install packages
npm install

# Start development server
npm run dev
```

App will be available at [http://localhost:5173](http://localhost:5173)

---

### Step 8 — Deploy to Vercel

1. Push your project to a GitHub repository
2. Go to [https://vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Framework preset: **Vite**
4. Build command: `npm run build`
5. Output directory: `dist`
6. **Environment Variables** — add all 8 variables from `.env.example` with your real values:
   - Click the **Environment Variables** tab in the Vercel project settings
   - Add each `VITE_*` variable one by one
7. Click **Deploy**

> **Important:** Vercel environment variables must be prefixed with `VITE_` to be exposed to the client-side bundle.

#### Optional: Also add your Vercel domain to Google's Authorized Origins
In Google Cloud Console → Credentials → your OAuth Client ID → add your Vercel URL to Authorized JavaScript Origins.

---

### Step 9 — Alternatively, Deploy to Firebase Hosting

```bash
# Build the app
npm run build

# Deploy
firebase deploy --only hosting
```

---

## Project Structure

```
/
├── firebaseConfig.js          # Firebase config (reads from .env)
├── firestore.rules            # Firestore security rules
├── storage.rules              # Storage security rules
├── firebase.json              # Firebase project config
├── firestore.indexes.json     # Composite indexes for queries
├── .env.example               # Required env vars template
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
└── src/
    ├── main.jsx               # React entry point
    ├── App.jsx                # Root — auth gate, routing, keyboard shortcuts
    ├── styles/
    │   └── globals.css        # Neon design system, CSS variables, base styles
    ├── components/
    │   ├── TopBar.jsx         # Fixed header: app name, live clock, workload badge
    │   ├── NavTabs.jsx        # Tab navigation: Dashboard / Tasks / Calendar / Tools
    │   ├── Dashboard.jsx      # Today's view with all task sections + PDF export
    │   ├── TaskCard.jsx       # Expandable task card with inline editing
    │   ├── TaskModal.jsx      # New task modal with dynamic fields per type
    │   ├── TasksTab.jsx       # Master task list with filters and sorting
    │   ├── NotesLog.jsx       # Append-only notes log per task
    │   ├── FileUpload.jsx     # Firebase Storage upload with progress bar
    │   ├── CalendarView.jsx   # Month grid + Google Calendar OAuth manager
    │   └── ToolsGrid.jsx      # Hotlinks grid with CRUD
    ├── hooks/
    │   ├── useAuth.js         # Firebase Auth state + Google sign-in/out
    │   ├── useTasks.js        # Firestore real-time task CRUD
    │   ├── useTools.js        # Firestore tools CRUD
    │   └── useCalendar.js     # Google Calendar API + linked calendars state
    └── lib/
        ├── firebase.js        # Firebase app initialization + exports
        ├── googleCalendar.js  # Google Calendar API helpers
        ├── pdfExport.js       # jsPDF export for today's task list
        └── rollForward.js     # Roll incomplete tasks forward on weekday load
```

---

## Firestore Data Model

```
users/
  {uid}/
    tasks/
      {taskId}    — see Task Schema below
    tools/
      {toolId}    — { name, url, favicon, createdAt }
    calendars/
      {calendarId} — { calendarId, summary, backgroundColor, enabled, linkedAt }
```

### Task Schema

```json
{
  "id": "string",
  "title": "string",
  "type": "open | event | daily | weekly | monthly",
  "priority": "Low | Med | High",
  "status": "Working on it | No progress | Stuck",
  "duration": 30,
  "dueDate": "Timestamp | null",
  "recurringDay": "Tuesday | null",
  "recurringTime": "09:00 | null",
  "recurringDayOfMonth": 15,
  "completed": false,
  "completedDate": "Timestamp | null",
  "notes": [{ "text": "string", "timestamp": "Timestamp", "author": "string" }],
  "attachments": [{ "name": "string", "url": "string", "size": 0, "uploadedAt": "ISO string", "path": "string" }],
  "createdAt": "Timestamp",
  "rolledOver": false
}
```

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `N` | Open New Task modal |
| `T` | Jump to Dashboard (Today) |
| `Esc` | Close any open modal |
| `Ctrl+Enter` | Submit note in notes log |

---

## Security

- All Firestore reads/writes are restricted to the authenticated user's own data via security rules
- Firebase Storage uploads are restricted to authenticated users, correct file types, and max 10MB
- No API keys are exposed — all keys are loaded from environment variables at build time
- Google OAuth tokens are stored in sessionStorage only (cleared on tab close)
- `.env.local` is gitignored

---

## Free Tier Notes

This app runs entirely on Firebase's **Spark (free) plan**:
- Firestore: 1 GB storage, 50k reads/day, 20k writes/day
- Storage: 5 GB, 1 GB/day download
- Auth: Unlimited Google sign-ins
- Hosting: 10 GB/month bandwidth

Google Calendar API has a free quota of 1,000,000 requests/day — more than enough for personal use.

---

## Troubleshooting

**"Firebase: Error (auth/unauthorized-domain)"**
→ Add your domain to Firebase Console → Authentication → Settings → Authorized domains

**"Google Calendar fetch failed: 401"**
→ The Google OAuth access token has expired. Sign out and sign back in to get a fresh token.

**"Missing or insufficient permissions"**
→ Deploy your Firestore security rules: `firebase deploy --only firestore:rules`

**Blank page after deploy**
→ Make sure all `VITE_*` environment variables are set in Vercel/Netlify dashboard. Check browser console for errors.

**"Vite: CORS error on favicon fetch"**
→ Normal in development. Google's favicon service works correctly in production. The app gracefully falls back to a generic link icon.
