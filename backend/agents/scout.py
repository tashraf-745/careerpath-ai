import json
from config import client, MODEL
from prompts import OPPORTUNITY_SCOUT_SYSTEM_PROMPT, OPPORTUNITY_SCOUT_SYNTHESIS_PROMPT
from tools import job_search, web_search


def opportunity_scout_agent(target_role: str, user_background: dict) -> dict:
    location         = user_background.get("location", "United States")
    experience_level = user_background.get("experience_level", "entry_level")
    raw_listings     = []
    source           = "job_board"

    try:
        raw_listings = job_search(
            query=target_role, location=location,
            experience_level=experience_level, num_results=10,
        )
    except Exception as e:
        print(f"Job board unavailable ({e}) — falling back to web_search")
        source = "web_search"
        results = web_search(query=f'"{target_role}" job opening {location} hiring 2025', num_results=10)
        raw_listings = [
            {
                "title":       r.get("title", ""),
                "company":     "",
                "location":    location,
                "description": r.get("snippet", ""),
                "apply_link":  r.get("link", ""),
            }
            for r in results
        ]

    # When using web search, snippets are search-aggregate pages, not real listings.
    # Use a synthesis prompt that generates representative market listings from the research.
    if source == "web_search":
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": OPPORTUNITY_SCOUT_SYNTHESIS_PROMPT},
                {"role": "user",   "content": json.dumps({
                    "target_role":     target_role,
                    "location":        location,
                    "user_background": user_background,
                    "market_research": raw_listings,
                })}
            ],
            temperature=0.3,
            max_tokens=1500,
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content)

    if not raw_listings:
        return {
            "agent":               "opportunity_scout_agent",
            "status":              "complete",
            "listings":            [],
            "top_match":           {},
            "relevance_reasoning": "No listings found for this role and location.",
            "coaching_note":       "Try broadening the location or adjusting the role title.",
        }

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": OPPORTUNITY_SCOUT_SYSTEM_PROMPT},
            {"role": "user",   "content": json.dumps({
                "target_role":     target_role,
                "user_background": user_background,
                "raw_listings":    raw_listings,
                "source":          source,
            })}
        ],
        temperature=0.0,
        max_tokens=1500,
        response_format={"type": "json_object"},
    )
    return json.loads(response.choices[0].message.content)
