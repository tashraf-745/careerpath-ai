import json
from config import client, MODEL
from prompts import ENTRY_CLASSIFIER_PROMPT
from session import save_long_term_memory
from agents.guidance import career_guidance_agent
from agents.scout import opportunity_scout_agent
from agents.strategist import application_strategist_agent
from agents.intelligence import career_intelligence_agent


def _has_apply_intent(message: str) -> bool:
    keywords = ["apply", "applying", "application", "help me with", "want this", "i choose", "i'll go with", "i want to apply"]
    msg = message.lower()
    return any(k in msg for k in keywords)


def _match_job_by_text(message: str, listings: list) -> dict | None:
    msg = message.lower()
    best, best_score = None, 0
    for job in listings:
        score = 0
        title   = (job.get("title",   "") or "").lower()
        company = (job.get("company", "") or "").lower()
        for word in company.split():
            if len(word) > 2 and word in msg:
                score += 3
        for word in title.split():
            if len(word) > 3 and word in msg:
                score += 1
        if score > best_score:
            best, best_score = job, score
    return best if best_score >= 2 else None


def _extract_job_from_message(message: str) -> dict:
    import re
    company_match = re.search(r'at\s+([A-Za-z0-9&\s]+?)(?:\s+as|\s+for|\s+help|\.|$)', message, re.I)
    title_match   = re.search(r'(?:applying|apply|for|as)\s+(?:an?\s+)?([A-Za-z\s]+?)(?:\s+at|\s+role|\s+position|$)', message, re.I)
    return {
        "title":      title_match.group(1).strip()   if title_match   else "the role",
        "company":    company_match.group(1).strip()  if company_match else "the company",
        "location":   "",
        "fit_score":  1.0,
        "apply_link": "",
        "salary_range": None,
    }


def trim_context(conversation_history: list, keep_last_n: int = 6) -> list:
    if len(conversation_history) <= keep_last_n:
        return conversation_history
    older_turns  = conversation_history[:-keep_last_n]
    recent_turns = conversation_history[-keep_last_n:]
    older_text = "\n".join(
        f"{m['role'].upper()}: {m['content'][:400]}" for m in older_turns)
    summary_response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": "Summarize this career coaching conversation in 4-5 sentences. Preserve key facts: background, target role, values, decisions, skills, blockers, next steps."},
            {"role": "user",   "content": older_text}
        ],
        temperature=0.0,
        max_tokens=250,
    )
    summary_text = summary_response.choices[0].message.content.strip()
    return [{"role": "system", "content": f"[CONTEXT SUMMARY]: {summary_text}"}] + recent_turns


def stage_router(session_state: dict) -> str:
    mode = session_state.get("mode", "career_guidance")

    if session_state.get("direction_known") is None:
        return "entry"

    if mode == "career_guidance":
        # Career guidance MUST have a real generated plan before job search
        if not session_state.get("plan_approved") or not session_state.get("approved_career_plan"):
            return "assessment"
    else:
        if not session_state.get("plan_approved", False):
            return "assessment"

    if session_state.get("selected_job") is None:
        return "job_search"
    if not session_state.get("resume_tailored", False):
        return "applying"
    return "tracking"


def entry_classifier(user_message: str) -> dict:
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": ENTRY_CLASSIFIER_PROMPT},
            {"role": "user",   "content": user_message}
        ],
        temperature=0.0,
        max_tokens=300,
        response_format={"type": "json_object"},
    )
    return json.loads(response.choices[0].message.content)


def run_career_workflow(user_message: str, session_state: dict) -> dict:
    if len(session_state["conversation_history"]) > 10:
        session_state["conversation_history"] = trim_context(
            session_state["conversation_history"], keep_last_n=6)
    session_state["context_turn_count"] = len(session_state["conversation_history"])
    session_state["conversation_history"].append({"role": "user", "content": user_message})

    route = stage_router(session_state)
    session_state["user_stage"] = route

    result = {}

    try:
        # DP1 — entry classification
        if route == "entry":
            clf       = entry_classifier(user_message)
            direction = clf.get("direction_known")
            session_state["direction_known"] = direction
            if clf.get("target_role_hint"):
                session_state["user_profile"]["target_role_hint"] = clf["target_role_hint"]

            if direction is None:
                session_state["pending_human_input"] = True
                result = {
                    "user_facing_message": clf.get("clarifying_question",
                        "Can you tell me more about what kind of work interests you?"),
                    "coaching_note": "There is no wrong answer here.",
                }
            elif direction is True:
                session_state["pending_human_input"] = False
                session_state["target_role"]          = clf.get("target_role_hint", "")
                role_hint = clf.get("target_role_hint", "your target role")
                mode      = session_state.get("mode", "career_guidance")

                if mode == "job_search":
                    # Job search: skip assessment entirely, go straight to listings
                    session_state["plan_approved"] = True
                    result = {
                        "user_facing_message": (
                            f"Great — you have a clear direction! "
                            f"Let me find current listings for **{role_hint}** now."
                        ),
                        "coaching_note": "Having a clear target makes everything else faster.",
                    }
                else:
                    # Career guidance: even with a direction, run the full assessment
                    # so the user gets a proper career map before job search
                    result = {
                        "user_facing_message": (
                            f"**{role_hint}** — good starting point. "
                            f"Before I start researching, I want to make sure we find the right fit "
                            f"*within* that world for you specifically. "
                            f"Tell me — what draws you to {role_hint}? "
                            f"And what does your background or experience look like so far?"
                        ),
                        "coaching_note": "Knowing the field is the first step — let's make sure the fit is right for you.",
                    }
            else:
                session_state["pending_human_input"] = False
                result = {
                    "user_facing_message": "No problem — that is exactly what I am here for. Let me start with a few questions to understand what makes you tick.",
                    "coaching_note": "Being lost is where every good career story starts.",
                }

        # DP2/3 — career guidance ReAct loop
        elif route == "assessment":
            if session_state.get("approved_career_plan") and "yes" in user_message.lower():
                session_state["plan_approved"]       = True
                session_state["pending_human_input"] = False
                result = {
                    "user_facing_message": f"Plan approved ✓ Let me search for live **{session_state.get('target_role', '')}** listings now.",
                    "coaching_note": "The plan is locked in — let us find the real opportunities.",
                }
            else:
                msg_lower = user_message.lower()

                # Track consecutive uncertain responses
                uncertain_phrases = [
                    "not sure", "don't know", "no idea", "i don't know",
                    "not certain", "unsure", "no clue", "not really sure",
                    "i am not", "i'm not sure", "have no idea",
                ]
                is_uncertain = any(p in msg_lower for p in uncertain_phrases)
                if is_uncertain:
                    session_state["uncertain_count"] = session_state.get("uncertain_count", 0) + 1
                else:
                    session_state["uncertain_count"] = 0

                # Detect skip intent or force plan after 2+ consecutive uncertain answers
                skip_phrases = [
                    "just give me a plan", "give me the plan", "skip the questions",
                    "skip questions", "just give me a roadmap", "give me a roadmap",
                    "i don't know just", "no idea just", "just tell me", "just show me",
                    "enough questions", "stop asking", "just make a plan",
                ]
                force_plan = (
                    any(p in msg_lower for p in skip_phrases)
                    or session_state.get("uncertain_count", 0) >= 2
                )

                guidance = career_guidance_agent(
                    {
                        **session_state["user_profile"],
                        "conversation_history": session_state["conversation_history"],
                        "user_is_uncertain":    is_uncertain,
                        "uncertain_count":      session_state.get("uncertain_count", 0),
                    },
                    force_plan=force_plan,
                )
                for field in ["values", "energy_sources", "energy_drains", "work_environment",
                              "learning_style", "risk_tolerance", "location_preference",
                              "timeline_urgency", "transferable_skills", "blockers", "role_models"]:
                    if guidance.get(field):
                        session_state[field] = guidance[field]

                if guidance.get("status") == "needs_input":
                    session_state["pending_human_input"] = True
                    # Combine research insight + question into one rich message
                    insight  = guidance.get("insight_shared", "")
                    question = guidance.get("next_question", "Tell me more.")
                    message  = f"{insight}\n\n{question}" if insight else question
                    result = {
                        "user_facing_message": message,
                        "coaching_note":       guidance.get("coaching_note", ""),
                        "react_steps_used":    guidance.get("react_steps_used", 0),
                    }
                else:
                    session_state["approved_career_plan"] = guidance
                    session_state["target_role"]          = guidance.get("recommended_path")
                    session_state["pending_human_input"]  = True

                    narrative = guidance.get("career_narrative") or ""
                    salary_p  = guidance.get("salary_progression", {})
                    paths     = guidance.get("top_career_paths", [])
                    action    = guidance.get("action_plan", [])
                    companies = guidance.get("key_companies", [])
                    outlook   = guidance.get("market_outlook", "")

                    # Build paths summary (all options, not just top 3)
                    paths_text = "\n".join(
                        f"  {i+1}. **{p['role']}** — fit {int(p.get('fit_score',0)*100)}%"
                        f"  |  {p.get('salary_range') or ('$'+str(p.get('salary_median',0))+'k')}"
                        f"  |  Entry in {p.get('time_to_entry','?')}\n"
                        f"     {p.get('why','')}"
                        for i, p in enumerate(paths)
                    )

                    # Build month-by-month action plan
                    plan_steps = "\n".join(
                        f"  **Month {s['month']}** — {s['action']}\n"
                        f"  → Resource: {s.get('resource','')}"
                        for s in action
                    )

                    # Salary progression line
                    sal_line = ""
                    if salary_p:
                        sal_line = (
                            f"\n**Salary Progression**\n"
                            f"Entry: ${salary_p.get('entry',0):,}  →  "
                            f"Mid: ${salary_p.get('mid',0):,}  →  "
                            f"Senior: ${salary_p.get('senior',0):,}+"
                        )

                    companies_line = f"\n**Top Companies Hiring:** {', '.join(companies[:6])}" if companies else ""
                    outlook_line   = f"\n\n**Market Outlook:** {outlook}" if outlook else ""

                    plan_msg = (
                        f"{narrative}\n\n"
                        f"{'━'*48}\n\n"
                        f"**Your Career Options**\n\n{paths_text}\n"
                        f"{sal_line}"
                        f"{companies_line}"
                        f"{outlook_line}\n\n"
                        f"{'━'*48}\n\n"
                        f"**Month-by-Month Action Plan**\n\n{plan_steps}\n\n"
                        f"{'━'*48}\n\n"
                        f"Does this feel right? Reply **yes** to move to job search, "
                        f"or tell me what you'd like to adjust."
                    )
                    result = {
                        "user_facing_message": plan_msg,
                        "career_plan":         guidance,
                        "coaching_note":       guidance.get("coaching_note", ""),
                        "react_steps_used":    guidance.get("react_steps_used", 0),
                    }
                    save_long_term_memory(session_state)

        # DP4/5 — job search + selection
        elif route == "job_search":
            listings     = session_state.get("last_listings", [])
            selected_job = None

            # 1. Numeric selection
            if user_message.strip().isdigit() and listings:
                idx = int(user_message.strip()) - 1
                if 0 <= idx < len(listings):
                    selected_job = listings[idx]

            # 2. Natural language selection — match by company or title keywords
            if not selected_job and listings:
                selected_job = _match_job_by_text(user_message, listings)

            # 3. Apply intent with no prior listings — extract job from message
            if not selected_job and _has_apply_intent(user_message) and not listings:
                selected_job = _extract_job_from_message(user_message)

            if selected_job:
                session_state["selected_job"]        = selected_job
                session_state["pending_human_input"] = False
                save_long_term_memory(session_state)

                # Auto-trigger applying stage immediately — no need for user to say "ok"
                resume_text = session_state.get("resume_text") or ""
                app_result  = application_strategist_agent(resume_text, selected_job)
                session_state["resume_tailored"] = True
                session_state["applied_jobs"].append(selected_job)
                save_long_term_memory(session_state)

                changes  = app_result.get("changes_made", [])[:3]
                keywords = app_result.get("keywords_added", [])[:4]
                missing  = app_result.get("keywords_not_in_resume", [])[:3]
                result = {
                    "user_facing_message": (
                        f"Got it — **{selected_job.get('title', 'the role')} @ {selected_job.get('company', '?')}**. "
                        f"I'll tailor your resume and write a cover letter for this role now.\n\n"
                        f"**Changes made:** {', '.join(changes) or 'See tailored resume'}\n"
                        f"**Keywords added:** {', '.join(keywords) or 'None'}\n"
                        f"**Skills to build:** {', '.join(missing) or 'None identified'}"
                    ),
                    "tailored_resume":  app_result.get("tailored_resume"),
                    "cover_letter":     app_result.get("cover_letter"),
                    "likely_questions": app_result.get("likely_questions", []),
                    "star_examples":    app_result.get("star_examples", []),
                    "coaching_note":    app_result.get("coaching_note", "Targeting one role at a time is the right approach."),
                }
            elif _has_apply_intent(user_message) and not listings:
                # User wants to apply to something but we have no listings yet — run search first
                target_role = session_state.get("target_role") or user_message
                user_bg = {
                    **session_state.get("user_profile", {}),
                    "location": session_state.get("location_preference") or "United States",
                }
                ranked = opportunity_scout_agent(target_role, user_bg)
                session_state["last_listings"]       = ranked.get("listings", [])
                session_state["pending_human_input"] = True
                listings_text = "\n".join(
                    f"  {i+1}. {l.get('title')} @ {l.get('company')} — {l.get('location', '?')}  (fit: {l.get('fit_score', '?')})"
                    for i, l in enumerate(ranked.get("listings", [])[:5])
                )
                result = {
                    "user_facing_message": (
                        f"Here are the best matches for **{target_role}**:\n\n{listings_text}\n\n"
                        f"Which one would you like to apply to? Reply with the number."
                    ),
                    "listings":      ranked.get("listings", []),
                    "coaching_note": ranked.get("coaching_note", ""),
                }
            elif listings and not user_message.strip().isdigit():
                # Already have listings, user sent text — remind them to pick a number
                listing_summary = "\n".join(
                    f"  {i+1}. {l.get('title')} @ {l.get('company')}"
                    for i, l in enumerate(listings[:5])
                )
                result = {
                    "user_facing_message": (
                        f"Which of these would you like to apply to? Reply with the number:\n\n{listing_summary}"
                    ),
                    "listings":      listings,
                    "coaching_note": "",
                }
            else:
                target_role = session_state.get("target_role") or ""
                user_bg = {
                    **session_state.get("user_profile", {}),
                    "location": session_state.get("location_preference") or "United States",
                }
                ranked = opportunity_scout_agent(target_role, user_bg)
                session_state["last_listings"]       = ranked.get("listings", [])
                session_state["pending_human_input"] = True
                listings_text = "\n".join(
                    f"  {i+1}. {l.get('title')} @ {l.get('company')} — {l.get('location', '?')}  (fit: {l.get('fit_score', '?')})"
                    for i, l in enumerate(ranked.get("listings", [])[:5])
                )
                result = {
                    "user_facing_message": (
                        f"Here are the best matches for **{target_role}**:\n\n{listings_text}\n\n"
                        f"Which one would you like to apply to? Reply with the number."
                    ),
                    "listings":      ranked.get("listings", []),
                    "coaching_note": ranked.get("coaching_note", ""),
                }

        # DP6 — application support
        elif route == "applying":
            if user_message.strip().isdigit():
                listings = session_state.get("last_listings", [])
                idx = int(user_message.strip()) - 1
                if 0 <= idx < len(listings):
                    session_state["selected_job"] = listings[idx]

            resume_text = session_state.get("resume_text") or ""
            job         = session_state.get("selected_job") or {}
            app_result  = application_strategist_agent(resume_text, job)

            session_state["resume_tailored"] = True
            session_state["applied_jobs"].append(job)
            save_long_term_memory(session_state)

            changes  = app_result.get("changes_made", [])[:3]
            keywords = app_result.get("keywords_added", [])[:4]
            missing  = app_result.get("keywords_not_in_resume", [])[:3]
            result = {
                "user_facing_message": (
                    f"Your tailored resume and cover letter for **{job.get('title', '?')} @ {job.get('company', '?')}** are ready.\n\n"
                    f"Changes: {', '.join(changes) or 'See tailored resume'}\n"
                    f"Keywords incorporated: {', '.join(keywords) or 'None'}\n"
                    f"Skills to build next: {', '.join(missing) or 'None identified'}\n\n"
                    f"{app_result.get('coaching_note', '')}"
                ),
                "tailored_resume":  app_result.get("tailored_resume"),
                "cover_letter":     app_result.get("cover_letter"),
                "likely_questions": app_result.get("likely_questions", []),
                "star_examples":    app_result.get("star_examples", []),
                "coaching_note":    app_result.get("coaching_note", ""),
            }

        # DP7 — tracking & intelligence
        elif route == "tracking":
            tracking = career_intelligence_agent(session_state)
            save_long_term_memory(session_state)
            result = {
                "user_facing_message": (
                    f"{tracking.get('application_summary', '')}\n\n"
                    f"**Industry update:** {tracking.get('industry_digest', '')}\n\n"
                    f"{tracking.get('accountability_prompt', '')}"
                ),
                "networking_templates": tracking.get("networking_template", {}),
                "follow_up_tips":       tracking.get("follow_up_tips", []),
                "rag_stats":            tracking.get("rag_stats", {}),
                "coaching_note":        tracking.get("coaching_note", ""),
            }

        else:
            result = {
                "user_facing_message": "I'm not sure where we are. Could you tell me what you'd like to work on next?",
                "coaching_note": "",
            }

    except Exception as e:
        result = {
            "user_facing_message": "Something went wrong on my end — please try again in a moment.",
            "coaching_note": "",
            "_error": str(e),
        }

    agent_msg = result.get("user_facing_message", "")
    if agent_msg:
        session_state["conversation_history"].append(
            {"role": "assistant", "content": agent_msg})
    if result.get("coaching_note"):
        session_state["last_coaching_note"] = result["coaching_note"]

    return {
        **result,
        "user_stage":          session_state["user_stage"],
        "route":               route,
        "pending_human_input": session_state.get("pending_human_input", False),
        "react_steps_used":    result.get("react_steps_used", 0),
    }
