# CareerPath AI

Full-stack career advisor: FastAPI backend + React frontend.

## Project structure

```
careerpath/
├── backend/
│   ├── main.py          — FastAPI server (port 8000)
│   ├── config.py        — env vars + OpenAI client
│   ├── tools.py         — web_search, job_search, salary_benchmark, parse_resume
│   ├── prompts.py       — all system prompts
│   ├── session.py       — session state + disk persistence
│   ├── workflow.py      — stage router + main orchestrator
│   ├── agents/
│   │   ├── guidance.py      — Career Guidance Agent (ReAct loop)
│   │   ├── scout.py         — Opportunity Scout Agent
│   │   ├── strategist.py    — Application Strategist Agent
│   │   └── intelligence.py  — Career Intelligence Agent (Agentic RAG)
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── screens/
    │   │   ├── Landing.tsx      — mode selection
    │   │   ├── StageOptions.tsx — role + resume upload
    │   │   └── Chat.tsx         — main chat interface
    │   ├── components/
    │   │   └── MessageBubble.tsx
    │   ├── api.ts           — fetch wrappers
    │   └── App.tsx
    └── package.json
```

## Setup

### 1 — Backend

```bash
cd careerpath/backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure API keys
cp .env.example .env
# Edit .env and add:
#   OPENAI_API_KEY=sk-...
#   SERPER_API_KEY=your_serper_key

# Start server
uvicorn main:app --reload --port 8000
```

### 2 — Frontend

```bash
cd careerpath/frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open **http://localhost:5173** in your browser.

## API keys

| Key | Required | Source |
|-----|----------|--------|
| `OPENAI_API_KEY` | Yes | platform.openai.com |
| `SERPER_API_KEY` | Yes | serper.dev (free tier: 2,500 searches) |
| `RAPIDAPI_KEY` | No | rapidapi.com/letscrape-6bfaf7eb/api/jsearch — job listings fall back to web search without it |
| `CURRENTS_API_KEY` | No | currentsapi.services — news falls back to web search without it |

## Workflow stages

| Stage | What happens |
|-------|-------------|
| Entry | Classifies whether the user has a career direction (LLM, no tools) |
| Assessment | ReAct loop: Thought → web_search/salary_benchmark → Observation → career plan |
| Job Search | Opportunity Scout ranks live listings by fit; user picks one |
| Applying | Researches company, tailors resume, writes cover letter + interview prep |
| Tracking | Agentic RAG filters industry news; surfaces progress + networking templates |
