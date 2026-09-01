# 🤖 CareerBot AI - Conversational Job Discovery & Direct Career Links

An AI-powered conversational job discovery platform that matches candidates with live job opportunities across verified company career portals (Greenhouse, Lever, Workday) and public job APIs without middleman spam.

---

## ✨ Features

- **💬 Conversational Job Discovery:** Natural language AI understands roles, tech stacks, salary requirements, location/remote preferences, and experience levels.
- **🔗 Direct Career Page Deep-Linking:** Direct 1-click links to verified company application portals and ATS pages.
- **⚡ AI Match Fit & Scoring:** Instant 0–100% suitability score with 1-line rationale explaining why a role fits the prompt.
- **🎯 1-Click Application Pitch Generator:** Generates high-impact tailored pitch bullet points, a ready-to-copy cover note, and role-specific interview preparation tips.
- **📄 Resume-Aware Matching:** Drop or paste resume text to automatically extract technical skills and discover tailored positions.
- **📌 Pipeline & Saved Jobs Tracker:** Bookmark opportunities with visual celebratory animations and manage pipeline status (`Saved` → `Applied` → `Interviewing` → `Offer`).

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 16 (App Router)](https://nextjs.org/) + TypeScript
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons & UI:** [Lucide React](https://lucide.dev/), `canvas-confetti`
- **Data Aggregation:** Remotive API, Arbeitnow API, and curated direct ATS company feeds
- **Runtime:** Node.js (v20+)

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ or 20+ installed.

### 2. Installation
```bash
# Navigate to the project directory
cd career-bot-ai

# Install dependencies (if not already installed)
npm install
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
npm run start
```

---

## 📁 Project Structure

```
career-bot-ai/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts      # Conversational AI & job recommendation route
│   │   │   ├── jobs/search/route.ts # REST API for querying jobs
│   │   │   ├── resume/route.ts    # Resume skill extraction route
│   │   │   └── tailor/route.ts    # 1-click pitch & cover letter generator
│   │   ├── globals.css            # Tailwind theme & custom scrollbars
│   │   ├── layout.tsx             # Root layout with metadata
│   │   └── page.tsx               # Main application view with state management
│   ├── components/
│   │   ├── Chat/
│   │   │   ├── ChatInterface.tsx  # Message stream & input bar
│   │   │   ├── JobCard.tsx        # Rich job card with direct career links
│   │   │   └── QuickPrompts.tsx   # Pre-built discovery chips
│   │   ├── Filters/
│   │   │   └── FilterDrawer.tsx   # Search preferences drawer
│   │   ├── Resume/
│   │   │   └── ResumeModal.tsx    # Resume drop & parse modal
│   │   ├── Saved/
│   │   │   └── SavedJobsDrawer.tsx# Saved job pipeline tracker
│   │   ├── Tailor/
│   │   │   └── TailorPitchModal.tsx # Application pitch modal
│   │   └── Header.tsx             # Top navigation & action buttons
│   ├── lib/
│   │   ├── ai-agent.ts            # Intent extraction & pitch generator logic
│   │   └── job-providers.ts       # Multi-source job aggregator
│   └── types/
│       └── job.ts                 # TypeScript type definitions
├── package.json
└── README.md
```

---

## 🔌 Connecting Additional Job APIs & LLMs (Optional)

The app works out of the box with zero configuration. You can optionally connect external API keys by creating a `.env.local` file:

```env
# Optional external LLM API keys
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Optional RapidAPI / JSearch key for enterprise queries
RAPIDAPI_KEY=your_rapidapi_key_here
```

---

## 📄 License
MIT License. Built for seamless job discovery.
