import sqlite3
import json
import os
from datetime import datetime, timezone

DB_PATH = os.getenv("DB_PATH", "/tmp/careerpath.db")


def get_conn() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True) if os.path.dirname(DB_PATH) else None
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            user_id       TEXT PRIMARY KEY,
            email         TEXT UNIQUE,
            password_hash TEXT,
            created_at    TEXT NOT NULL,
            last_seen     TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            user_id    TEXT NOT NULL,
            mode       TEXT NOT NULL,
            title      TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            state_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS user_memory (
            user_id     TEXT PRIMARY KEY,
            memory_json TEXT NOT NULL,
            updated_at  TEXT NOT NULL
        );
    """)
    # Migrate existing DB: add columns if they don't exist yet
    existing = {row[1] for row in conn.execute("PRAGMA table_info(users)").fetchall()}
    if "email" not in existing:
        conn.execute("ALTER TABLE users ADD COLUMN email TEXT")
        conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)")
    if "password_hash" not in existing:
        conn.execute("ALTER TABLE users ADD COLUMN password_hash TEXT")
    conn.commit()
    conn.close()


def register_user(user_id: str, email: str, password_hash: str):
    conn = get_conn()
    now  = datetime.now(timezone.utc).isoformat()
    conn.execute("""
        INSERT INTO users (user_id, email, password_hash, created_at, last_seen)
        VALUES (?, ?, ?, ?, ?)
    """, (user_id, email, password_hash, now, now))
    conn.commit()
    conn.close()


def get_user_by_email(email: str) -> dict | None:
    conn = get_conn()
    row  = conn.execute(
        "SELECT user_id, email, password_hash FROM users WHERE email = ?", (email,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def upsert_user(user_id: str):
    conn = get_conn()
    now = datetime.now(timezone.utc).isoformat()
    conn.execute("""
        INSERT INTO users (user_id, created_at, last_seen)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET last_seen = excluded.last_seen
    """, (user_id, now, now))
    conn.commit()
    conn.close()


def save_session_to_db(session_id: str, user_id: str, mode: str, state: dict):
    conn = get_conn()
    now   = datetime.now(timezone.utc).isoformat()
    title = _make_title(state, mode)
    conn.execute("""
        INSERT INTO sessions (session_id, user_id, mode, title, created_at, updated_at, state_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(session_id) DO UPDATE SET
            updated_at = excluded.updated_at,
            title      = excluded.title,
            state_json = excluded.state_json
    """, (session_id, user_id, mode, title, now, now, json.dumps(state)))
    conn.commit()
    conn.close()


def load_session_from_db(session_id: str) -> dict | None:
    conn = get_conn()
    row  = conn.execute(
        "SELECT state_json FROM sessions WHERE session_id = ?", (session_id,)
    ).fetchone()
    conn.close()
    return json.loads(row["state_json"]) if row else None


def get_session_mode(session_id: str) -> str | None:
    conn = get_conn()
    row  = conn.execute(
        "SELECT mode FROM sessions WHERE session_id = ?", (session_id,)
    ).fetchone()
    conn.close()
    return row["mode"] if row else None


def delete_session(session_id: str, user_id: str) -> bool:
    conn = get_conn()
    cur  = conn.execute(
        "DELETE FROM sessions WHERE session_id = ? AND user_id = ?", (session_id, user_id)
    )
    conn.commit()
    deleted = cur.rowcount > 0
    conn.close()
    return deleted


def get_user_sessions(user_id: str) -> list[dict]:
    conn = get_conn()
    rows = conn.execute("""
        SELECT session_id, mode, title, created_at, updated_at
        FROM sessions
        WHERE user_id = ?
        ORDER BY updated_at DESC
        LIMIT 20
    """, (user_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def save_user_memory(user_id: str, memory: dict):
    conn = get_conn()
    now  = datetime.now(timezone.utc).isoformat()
    conn.execute("""
        INSERT INTO user_memory (user_id, memory_json, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            memory_json = excluded.memory_json,
            updated_at  = excluded.updated_at
    """, (user_id, json.dumps(memory), now))
    conn.commit()
    conn.close()


def load_user_memory(user_id: str) -> dict:
    conn = get_conn()
    row  = conn.execute(
        "SELECT memory_json FROM user_memory WHERE user_id = ?", (user_id,)
    ).fetchone()
    conn.close()
    return json.loads(row["memory_json"]) if row else {}


def _make_title(state: dict, mode: str) -> str:
    for msg in state.get("conversation_history", []):
        if msg.get("role") == "user":
            text = msg["content"].strip()
            return (text[:52] + "…") if len(text) > 52 else text
    role = state.get("target_role")
    if role:
        return f"{role} search"
    return "Career guidance" if mode == "career_guidance" else "Job search"
