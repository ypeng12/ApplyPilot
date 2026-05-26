# ApplyPilot AI 🚀

ApplyPilot AI is an advanced, privacy-first, browser-based AI job application agent. It allows users to autofill job applications instantly and generate tailored, job-specific short answers (e.g., "Why this role?", "Explain a project you're proud of") using Gemini AI, all directly within their browser pages (LinkedIn, Greenhouse, Lever, Ashby, etc.) via a Manifest V3 Chrome Extension.

ApplyPilot AI keeps the user firmly in the loop: it reads the page, fills standard fields instantly, uses Gemini to draft high-quality short answers, allows manual review/editing in a beautiful sidebar, and records submitted applications for tracking.

---

## 🏗 Project Structure

```text
applypilot-ai/
│
├── backend/                  # FastAPI Backend API
│   ├── app/
│   │   ├── main.py           # API entry point & lifecycle
│   │   ├── api/
│   │   │   └── endpoints.py  # REST endpoints for parsing and mapping
│   │   ├── agents/
│   │   │   └── mapper.py     # Gemini Agent reasoning & response generator
│   │   ├── models/
│   │   │   ├── profile.py    # Profile Vault data schemas
│   │   │   └── job.py        # Job parsing & field schema
│   │   └── utils/
│   ├── requirements.txt      # Python dependencies
│   ├── .env.example          # Environment variables template
│   └── Dockerfile
│
├── extension/                # Chrome Extension (React + TS + Vite + Tailwind/CSS)
│   ├── src/
│   │   ├── content/
│   │   │   └── index.ts      # Scrapes DOM, performs instant autofill injection
│   │   ├── background/
│   │   │   └── index.ts      # Background service worker proxying requests
│   │   ├── sidebar/
│   │   │   ├── Sidebar.tsx   # Glassmorphic React sidebar controller
│   │   │   ├── index.html    # Sidebar layout HTML
│   │   │   └── index.tsx     # React bootstrap
│   │   ├── index.css         # Styling system & dark mode tokens
│   │   └── utils/
│   ├── manifest.json         # Manifest V3 extension settings
│   ├── package.json          # Vite + React build systems
│   └── vite.config.ts        # Bundler configuration
│
└── README.md
```

---

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
uvicorn app.main:app --reload --port 8000
```

### 2. Chrome Extension Setup
```bash
cd extension
npm install
npm run dev # Launches Vite HMR for development
```
Then load the compiled extension:
1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** in the top right.
3. Click **Load unpacked** and select the `extension/dist` folder (or the project folder after building).

---

## 🔒 Privacy & Safety (Local-First Design)
To respect candidate privacy, ApplyPilot AI implements a **Local-First Architecture**:
- All personal profile information, work experience, resume content, and credentials are saved locally in the browser (`chrome.storage.local`).
- The backend FastAPI works as a stateless processor—it receives specific segments of the resume and job description to perform mapping and response generation using Gemini API, but **does not** persist sensitive candidate data.
- The MongoDB instance optionally stores application records (date, company, role, status) to power a visual tracking dashboard, completely free of sensitive personal details.
