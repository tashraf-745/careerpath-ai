import os
import json
from config import MEMORY_DIR
from database import load_user_memory, save_user_memory

LONG_TERM_FIELDS = [
    "user_profile", "values", "energy_sources", "energy_drains",
    "work_environment", "learning_style", "risk_tolerance",
    "location_preference", "timeline_urgency", "transferable_skills",
    "blockers", "role_models", "target_role", "approved_career_plan",
    "resume_text", "applied_jobs", "last_coaching_note",
]


def new_session(session_id: str, user_id: str | None = None, mode: str = "career_guidance") -> dict:
    state = {
        "session_id":           session_id,
        "user_id":              user_id,
        "mode":                 mode,
        "user_stage":           "entry",
        "direction_known":      None,
        "plan_approved":        False,
        "selected_job":         None,
        "resume_tailored":      False,
        "last_listings":        [],
        "current_goal":         None,
        "tools_used_this_turn": [],
        "last_observation":     None,
        "user_profile":         {},
        "values":               [],
        "energy_sources":       [],
        "energy_drains":        [],
        "work_environment":     None,
        "learning_style":       None,
        "risk_tolerance":       None,
        "location_preference":  None,
        "timeline_urgency":     None,
        "transferable_skills":  [],
        "blockers":             [],
        "role_models":          [],
        "target_role":          None,
        "approved_career_plan": None,
        "resume_text":          None,
        "applied_jobs":         [],
        "last_coaching_note":   None,
        "conversation_history": [],
        "context_turn_count":   0,
        "pending_human_input":  False,
    }

    # Load cross-session memory for returning users
    if user_id:
        memory = load_user_memory(user_id)
        if memory:
            state.update({k: v for k, v in memory.items() if k in LONG_TERM_FIELDS})
            _inject_returning_user_context(state, memory)

    return state


def _inject_returning_user_context(state: dict, memory: dict):
    parts = []
    if memory.get("target_role"):
        parts.append(f"target role: {memory['target_role']}")
    if memory.get("approved_career_plan"):
        plan = memory["approved_career_plan"]
        if isinstance(plan, dict) and plan.get("recommended_path"):
            parts.append(f"approved career plan: {plan['recommended_path']}")
    if memory.get("applied_jobs"):
        jobs = memory["applied_jobs"]
        last = jobs[-1]
        parts.append(
            f"has applied to {len(jobs)} job(s), most recently "
            f"{last.get('title','?')} at {last.get('company','?')}"
        )
    if memory.get("values"):
        parts.append(f"core values: {', '.join(memory['values'][:3])}")
    if memory.get("transferable_skills"):
        parts.append(f"key skills: {', '.join(memory['transferable_skills'][:4])}")

    if parts:
        note = (
            "[RETURNING USER] This user has spoken with CareerPath AI before. "
            f"What you already know: {'; '.join(parts)}. "
            "Reference this naturally — do not re-ask for information you already have."
        )
        state["conversation_history"].insert(0, {"role": "system", "content": note})


def save_long_term_memory(session_state: dict) -> None:
    sid     = session_state["session_id"]
    user_id = session_state.get("user_id")
    payload = {k: session_state[k] for k in LONG_TERM_FIELDS if k in session_state}

    os.makedirs(MEMORY_DIR, exist_ok=True)
    path = os.path.join(MEMORY_DIR, f"{sid}.json")
    with open(path, "w") as f:
        json.dump(payload, f, indent=2)

    if user_id:
        save_user_memory(user_id, payload)


def load_long_term_memory(session_id: str) -> dict:
    path = os.path.join(MEMORY_DIR, f"{session_id}.json")
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return {}
