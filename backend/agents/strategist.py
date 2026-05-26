import json
from config import client, MODEL, STAGE_AFFORDANCES
from prompts import APPLICATION_STRATEGIST_SYSTEM_PROMPT
from tools import web_search


def application_strategist_agent(resume_text: str, job_listing: dict) -> dict:
    if not resume_text or resume_text.startswith("[PARSE ERROR]"):
        return {
            "agent":         "application_strategist_agent",
            "status":        "error",
            "error":         "Resume text is empty or unparseable. Please upload a valid .pdf or .docx file.",
            "coaching_note": "A text-based PDF works best — try exporting from Google Docs or Word.",
        }

    company_name     = job_listing.get("company", "")
    role_title       = job_listing.get("title", "")
    company_research = []

    if company_name and "web_search" in STAGE_AFFORDANCES["applying"]:
        try:
            company_research = web_search(
                query=f"{company_name} culture values interview process {role_title} 2025",
                num_results=6,
            )
        except Exception:
            try:
                company_research = web_search(
                    query=f"{company_name} {role_title} 2025", num_results=5)
            except Exception:
                company_research = []

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": APPLICATION_STRATEGIST_SYSTEM_PROMPT},
            {"role": "user",   "content": json.dumps({
                "original_resume":  resume_text,
                "job_listing":      job_listing,
                "company_research": company_research,
            })}
        ],
        temperature=0.0,
        max_tokens=2500,
        response_format={"type": "json_object"},
    )
    return json.loads(response.choices[0].message.content)
