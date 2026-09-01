# CareerBot AI - Conversational Job Search Platform

**CareerBot AI** is a conversational AI job search application that understands nuanced candidate preferences, aggregates live job postings across verified sources and company ATS systems (Greenhouse, Lever, Workday), scores match fit, and provides **direct 1-click links to company career and application pages** without middleman spam.

---

## Key Features Built

### 1. Conversational AI Job Search (`/api/chat`)
- Natural language intent & entity parsing: extracts job titles, technology stacks, remote/hybrid status, experience levels, and locations.
- Returns conversational insights alongside rich, structured **Job Cards**.
- Interactive follow-up suggestion chips (e.g. *"Show remote only roles"*, *"Find jobs with salary over \$150k"*).

### 2. Verified Direct Career Page Linking (`src/components/Chat/JobCard.tsx`)
- Direct **"Direct Apply"** CTA buttons linking directly to verified company career portals and ATS listings (Greenhouse, Lever, Remotive, Arbeitnow).
- Badges for **Remote**, **Location**, **Salary Range**, **Experience Level**, and **Post Date**.
- **AI Match Score Meter** (0–100%) explaining why each position matches the user's specific prompt.

### 3. 1-Click Application Pitch & Cover Note Generator (`/api/tailor`)
- A **"Tailor Pitch"** tool on every job card that automatically drafts:
  - 3 targeted, high-impact bullet points connecting the candidate's skills to the specific job.
  - A ready-to-send concise cover note / outreach message with 1-click clipboard copy.
  - Custom interview preparation tips tailored to the role and company.

### 4. Resume-Aware Skill Extraction (`/api/resume`)
- Users can paste their resume summary or choose pre-set sample profiles.
- Automatically extracts primary technical skills, experience years, and suggested titles, then instantly queries matched job listings.

### 5. Persistent Saved Opportunities & Pipeline Tracker
- Bookmark jobs directly from cards (with visual confetti celebration).
- Slide-over pipeline drawer with application tracking statuses: `Saved` → `Applied` → `Interviewing` → `Offer Received`.
- Persisted locally via browser `localStorage`.

---

## Architecture & Codebase Map

| File / Route | Purpose |
| :--- | :--- |
| [page.tsx](file:///C:/Users/ASUS/.gemini/antigravity/scratch/career-bot-ai/src/app/page.tsx) | Main application shell connecting state, chat messages, drawers, and modals |
| [job-providers.ts](file:///C:/Users/ASUS/.gemini/antigravity/scratch/career-bot-ai/src/lib/job-providers.ts) | Multi-source job aggregator querying Remotive API, Arbeitnow API, and curated ATS feeds |
| [ai-agent.ts](file:///C:/Users/ASUS/.gemini/antigravity/scratch/career-bot-ai/src/lib/ai-agent.ts) | Query extraction, intent classification, match scoring, and cover letter generator |
| [/api/chat](file:///C:/Users/ASUS/.gemini/antigravity/scratch/career-bot-ai/src/app/api/chat/route.ts) | Chat backend route returning assistant reasoning and structured job cards |
| [/api/jobs/search](file:///C:/Users/ASUS/.gemini/antigravity/scratch/career-bot-ai/src/app/api/jobs/search/route.ts) | REST endpoint for direct parameterized job search |
| [/api/tailor](file:///C:/Users/ASUS/.gemini/antigravity/scratch/career-bot-ai/src/app/api/tailor/route.ts) | Pitch and cover note generator for specific job cards |
| [/api/resume](file:///C:/Users/ASUS/.gemini/antigravity/scratch/career-bot-ai/src/app/api/resume/route.ts) | Resume skill parser and job matching bridge |
| [JobCard.tsx](file:///C:/Users/ASUS/.gemini/antigravity/scratch/career-bot-ai/src/components/Chat/JobCard.tsx) | Interactive job card with career page links, match score, and quick actions |

---

## Verification Results

### 1. Build Verification
- Clean TypeScript compilation & Next.js production build:
  ```bash
  npm run build
  ```
  `✓ Compiled successfully in 27.4s` with zero bundle errors.

### 2. API Endpoint Testing
- **Chat & Live Job Matching**: Tested with query `"find remote senior react jobs"`:
  - Sourced live positions from multi-source aggregator.
  - Generated match scores (91–98%) and extracted filters correctly.
  - Returned direct verified application links.
- **Tailor Pitch Generator**: Tested for Senior Frontend Engineer:
  - Generated tailored bullet points, cover note, and interview tips.
- **Resume Extraction**: Tested with 5-year full stack profile:
  - Successfully extracted skills (`TypeScript`, `React`, `Python`, `AWS`, `PostgreSQL`) and recommended targeted roles.

---

## How to Run & Use the App

The development server is running at:
```
http://localhost:3000
```

To run manually in the future:
```powershell
cd C:\Users\ASUS\.gemini\antigravity\scratch\career-bot-ai
npm.cmd run dev
```
