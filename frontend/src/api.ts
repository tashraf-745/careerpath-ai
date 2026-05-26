const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api'

function authHeaders(): Record<string, string> {
  try {
    const raw = localStorage.getItem('careerpath_auth')
    if (!raw) return {}
    const { token } = JSON.parse(raw)
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

export interface SessionInfo {
  session_id: string
  mode:       string
  user_stage: string
}

export interface PastSession {
  session_id: string
  mode:       string
  title:      string
  created_at: string
  updated_at: string
}

export interface ResumedMessage {
  role: 'user' | 'agent'
  text: string
}

export interface ChatResponse {
  user_facing_message: string
  user_stage:          string
  route:               string
  coaching_note:       string
  pending_human_input: boolean
  react_steps_used:    number
  listings?:           JobListing[]
  career_plan?:        CareerPlan
  tailored_resume?:    string
  cover_letter?:       string
  likely_questions?:   string[]
  star_examples?:      StarExample[]
  networking_templates?: NetworkingTemplates
  follow_up_tips?:     string[]
  rag_stats?:          RagStats
  _error?:             string
}

export interface JobListing {
  title:         string
  company:       string
  location:      string
  fit_score:     number
  fit_reasoning: string
  apply_link:    string
  salary_range:  string | null
}

export interface CareerPlan {
  recommended_path: string
  timeline_months:  number
  skills_gap:       string[]
  action_plan:      ActionItem[]
  top_career_paths: CareerPath[]
}

export interface ActionItem {
  month:    string
  action:   string
  resource: string
}

export interface CareerPath {
  role:          string
  fit_score:     number
  why:           string
  salary_median: number
}

export interface StarExample {
  situation: string
  task:      string
  action:    string
  result:    string
}

export interface NetworkingTemplates {
  cold_linkedin_dm:              string
  informational_interview_email: string
}

export interface RagStats {
  articles_retrieved: number
  articles_validated: number
  filter_rate:        string
  source:             string
}

export async function createSession(
  mode: 'job_search' | 'career_guidance',
  userId: string,
): Promise<SessionInfo> {
  const res = await fetch(`${BASE}/session`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body:    JSON.stringify({ mode, user_id: userId }),
  })
  if (!res.ok) throw new Error('Failed to create session')
  return res.json()
}

export async function getUserSessions(userId: string): Promise<PastSession[]> {
  const res = await fetch(`${BASE}/users/${userId}/sessions`, {
    headers: authHeaders(),
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.sessions ?? []
}

export async function getSessionMessages(
  sessionId: string,
): Promise<{ messages: ResumedMessage[]; mode: string }> {
  const res = await fetch(`${BASE}/session/${sessionId}/messages`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to load messages')
  return res.json()
}

export async function setTargetRole(sessionId: string, targetRole: string): Promise<void> {
  await fetch(`${BASE}/session/${sessionId}/role`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body:    JSON.stringify({ session_id: sessionId, target_role: targetRole }),
  })
}

export async function uploadResume(
  sessionId: string,
  file: File,
): Promise<{ chars: number; preview: string }> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/session/${sessionId}/resume`, {
    method:  'POST',
    headers: authHeaders(),
    body:    form,
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'Upload failed')
  }
  return res.json()
}

export async function deleteSession(sessionId: string, userId: string): Promise<void> {
  const res = await fetch(`${BASE}/session/${sessionId}?user_id=${encodeURIComponent(userId)}`, {
    method:  'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Delete failed')
}

export async function sendMessage(sessionId: string, message: string): Promise<ChatResponse> {
  const res = await fetch(`${BASE}/chat`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body:    JSON.stringify({ session_id: sessionId, message }),
  })
  if (!res.ok) throw new Error('Chat request failed')
  return res.json()
}
