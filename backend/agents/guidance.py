import json
from config import client, MODEL, STAGE_AFFORDANCES
from prompts import CAREER_GUIDANCE_THOUGHT_PROMPT, CAREER_GUIDANCE_SYSTEM_PROMPT
from tools import web_search, get_salary_benchmark


def career_guidance_agent(user_profile: dict, max_react_steps: int = 5, force_plan: bool = False) -> dict:
    history = user_profile.get("conversation_history", [])
    if not history and not force_plan:
        return {
            "agent":               "career_guidance_agent",
            "status":              "needs_input",
            "insight_shared":      "",
            "next_question":       "Tell me a little about yourself — what have you been up to lately, and what brought you here today?",
            "values":              [],
            "energy_sources":      [],
            "energy_drains":       [],
            "work_environment":    None,
            "learning_style":      None,
            "risk_tolerance":      None,
            "location_preference": None,
            "timeline_urgency":    None,
            "transferable_skills": [],
            "blockers":            [],
            "role_models":         [],
            "top_career_paths":    [],
            "recommended_path":    None,
            "timeline_months":     0,
            "skills_gap":          [],
            "action_plan":         [],
            "react_steps_used":    0,
            "coaching_note":       "There are no wrong answers here — just honest ones.",
        }

    react_state = {
        "user_profile":    user_profile,
        "thoughts":        [],
        "observations":    [],
        "tools_used":      [],
        "shareable_facts": [],
    }
    permitted = STAGE_AFFORDANCES["assessment"]

    # Skip ReAct loop if forced straight to plan
    if not force_plan:
        for step in range(max_react_steps):
            thought_response = client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": CAREER_GUIDANCE_THOUGHT_PROMPT},
                    {"role": "user",   "content": json.dumps({
                        "user_profile":    react_state["user_profile"],
                        "thoughts_so_far": react_state["thoughts"],
                        "observations":    react_state["observations"],
                        "step":            step + 1,
                        "force_plan":      force_plan,
                        "user_is_uncertain": user_profile.get("user_is_uncertain", False),
                        "uncertain_count":   user_profile.get("uncertain_count", 0),
                        "instruction": (
                            "The user is unsure — research concrete beginner entry paths and options "
                            "they can choose between rather than asking what they already don't know."
                            if user_profile.get("user_is_uncertain") else ""
                        ),
                    })}
                ],
                temperature=0.0,
                max_tokens=600,
                response_format={"type": "json_object"},
            )
            thought = json.loads(thought_response.choices[0].message.content)
            react_state["thoughts"].append(thought)

            # Collect shareable facts from each thought step
            if thought.get("shareable_fact"):
                react_state["shareable_facts"].append(thought["shareable_fact"])

            action    = thought.get("action", "synthesize")
            tool_args = thought.get("tool_args", {})

            if thought.get("done") or action == "synthesize":
                break

            obs = {"step": step + 1, "action": action, "result": None}
            if action == "web_search" and "web_search" in permitted:
                q = tool_args.get("query", "")
                if q:
                    obs["result"] = web_search(query=q, num_results=5)
                    react_state["tools_used"].append("web_search")
            elif action == "get_salary_benchmark" and "get_salary_benchmark" in permitted:
                occ = tool_args.get("occupation",
                                    react_state["user_profile"].get("target_role_hint", ""))
                if occ:
                    obs["result"] = get_salary_benchmark(occupation=occ)
                    react_state["tools_used"].append("get_salary_benchmark")
            else:
                obs["result"] = {"note": f"Action '{action}' not permitted in assessment stage."}

            react_state["observations"].append(obs)

    synthesis_response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": CAREER_GUIDANCE_SYSTEM_PROMPT},
            {"role": "user",   "content": json.dumps({
                "user_profile":    react_state["user_profile"],
                "observations":    react_state["observations"],
                "tools_used":      react_state["tools_used"],
                "shareable_facts": react_state["shareable_facts"],
                "react_steps":     len(react_state["thoughts"]),
                "force_plan":      force_plan,
            })}
        ],
        temperature=0.7,
        max_tokens=4000,
        response_format={"type": "json_object"},
    )
    result = json.loads(synthesis_response.choices[0].message.content)
    result["react_steps_used"] = len(react_state["thoughts"])
    return result
