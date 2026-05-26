import uuid
import os
from fastapi import FastAPI, UploadFile, File, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from database import (
    init_db, upsert_user,
    save_session_to_db, load_session_from_db,
    get_user_sessions, register_user, get_user_by_email, delete_session,
)
from session import new_session
from workflow import run_career_workflow
from tools import parse_resume_bytes
from auth import hash_password, verify_password, create_token, decode_token

app = FastAPI(title="CareerPath AI")


@app.on_event("startup")
def startup():
    init_db()


_frontend = os.getenv("FRONTEND_URL", "")
_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
if _frontend:
    _origins.append(_frontend)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory cache — populated from SQLite on first access
_sessions: dict = {}


def get_session(session_id: str) -> dict | None:
    if session_id in _sessions:
        return _sessions[session_id]
    state = load_session_from_db(session_id)
    if state:
        _sessions[session_id] = state
    return state


def _persist(session_id: str):
    state = _sessions.get(session_id)
    if state:
        save_session_to_db(
            session_id,
            state.get("user_id") or "anonymous",
            state.get("mode", "career_guidance"),
            state,
        )


class AuthRequest(BaseModel):
    email:    str
    password: str


class NewSessionRequest(BaseModel):
    mode:    str
    user_id: str | None = None


class ChatRequest(BaseModel):
    session_id: str
    message:    str


class SetTargetRoleRequest(BaseModel):
    session_id:  str
    target_role: str


@app.post("/api/auth/register")
def auth_register(req: AuthRequest):
    if get_user_by_email(req.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    register_user(user_id, req.email, hash_password(req.password))
    token = create_token(user_id, req.email)
    return {"token": token, "user_id": user_id, "email": req.email}


@app.post("/api/auth/login")
def auth_login(req: AuthRequest):
    user = get_user_by_email(req.email)
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    upsert_user(user["user_id"])
    token = create_token(user["user_id"], req.email)
    return {"token": token, "user_id": user["user_id"], "email": req.email}


@app.get("/api/auth/me")
def auth_me(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(authorization[7:])
        return {"user_id": payload["sub"], "email": payload["email"]}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@app.post("/api/session")
def create_session(req: NewSessionRequest):
    session_id = str(uuid.uuid4())
    user_id    = req.user_id or None

    if user_id:
        upsert_user(user_id)

    state = new_session(session_id, user_id=user_id, mode=req.mode)

    if req.mode == "job_search":
        state["direction_known"] = True
        state["plan_approved"]   = True

    _sessions[session_id] = state
    save_session_to_db(session_id, user_id or "anonymous", req.mode, state)

    return {
        "session_id": session_id,
        "mode":       req.mode,
        "user_stage": state["user_stage"],
    }


@app.get("/api/users/{user_id}/sessions")
def list_user_sessions(user_id: str):
    sessions = get_user_sessions(user_id)
    return {"sessions": sessions}


@app.delete("/api/session/{session_id}")
def remove_session(session_id: str, user_id: str):
    if session_id in _sessions:
        del _sessions[session_id]
    deleted = delete_session(session_id, user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"ok": True}


@app.get("/api/session/{session_id}")
def get_session_info(session_id: str):
    state = get_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "session_id":    session_id,
        "user_stage":    state.get("user_stage"),
        "target_role":   state.get("target_role"),
        "plan_approved": state.get("plan_approved"),
        "resume_text":   bool(state.get("resume_text")),
        "applied_jobs":  state.get("applied_jobs", []),
    }


@app.get("/api/session/{session_id}/messages")
def get_session_messages(session_id: str):
    state = get_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    messages = []
    for msg in state.get("conversation_history", []):
        if msg["role"] == "system":
            continue
        messages.append({
            "role": "user" if msg["role"] == "user" else "agent",
            "text": msg["content"],
        })
    return {"messages": messages, "mode": state.get("mode", "career_guidance")}


@app.post("/api/session/{session_id}/role")
def set_target_role(session_id: str, req: SetTargetRoleRequest):
    state = get_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    state["target_role"]  = req.target_role
    state["direction_known"] = True
    state["plan_approved"]   = True
    state["user_profile"]["target_role_hint"] = req.target_role
    return {"ok": True, "target_role": req.target_role}


@app.post("/api/session/{session_id}/resume")
async def upload_resume(session_id: str, file: UploadFile = File(...)):
    state = get_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    content = await file.read()
    try:
        text = parse_resume_bytes(content, file.filename or "resume.pdf")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    state["resume_text"] = text
    return {
        "ok":       True,
        "filename": file.filename,
        "chars":    len(text),
        "preview":  text[:300],
    }


@app.post("/api/chat")
def chat(req: ChatRequest):
    state = get_session(req.session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    result = run_career_workflow(req.message, state)
    _persist(req.session_id)
    return result


@app.get("/api/health")
def health():
    return {"status": "ok"}
