import json
from config import client, MODEL, STAGE_AFFORDANCES
from prompts import AGENTIC_RAG_FILTER_PROMPT, CAREER_INTELLIGENCE_SYSTEM_PROMPT
from tools import get_news, web_search


def agentic_rag_filter(articles: list, target_role: str, stage: str) -> list:
    if not articles:
        return []
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": AGENTIC_RAG_FILTER_PROMPT},
            {"role": "user",   "content": json.dumps({
                "target_role": target_role,
                "stage":       stage,
                "articles":    [{
                    "index":       i,
                    "title":       a.get("title", ""),
                    "description": a.get("description", ""),
                    "published":   a.get("published", ""),
                    "url":         a.get("url", ""),
                } for i, a in enumerate(articles)],
            })}
        ],
        temperature=0.0,
        max_tokens=400,
        response_format={"type": "json_object"},
    )
    result = json.loads(response.choices[0].message.content)
    valid_indices = result.get("relevant_indices", [])
    return [articles[i] for i in valid_indices if i < len(articles)]


def career_intelligence_agent(session_state: dict) -> dict:
    target_role  = session_state.get("target_role", "")
    applied_jobs = session_state.get("applied_jobs", [])
    raw_articles = []
    source       = "news_api"

    if target_role and "get_news" in STAGE_AFFORDANCES["tracking"]:
        try:
            raw_articles = get_news(
                f"{target_role} industry hiring trends 2025", num_results=20)
        except Exception as e:
            print(f"News API unavailable ({e}) — falling back to web_search")

        if not raw_articles:
            source = "web_search"
            try:
                results = web_search(
                    query=f"{target_role} industry hiring trends news 2025",
                    num_results=10,
                )
                raw_articles = [
                    {
                        "title":       r.get("title", ""),
                        "description": r.get("snippet", ""),
                        "url":         r.get("link", ""),
                        "published":   "2025",
                        "category":    ["career"],
                    }
                    for r in results
                ]
            except Exception:
                raw_articles = []

    if source == "web_search":
        validated_articles = raw_articles
    else:
        validated_articles = agentic_rag_filter(raw_articles, target_role, "tracking")

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": CAREER_INTELLIGENCE_SYSTEM_PROMPT},
            {"role": "user",   "content": json.dumps({
                "applied_jobs":       applied_jobs,
                "validated_articles": validated_articles,
                "target_role":        target_role,
                "raw_count":          len(raw_articles),
                "validated_count":    len(validated_articles),
                "source":             source,
            })}
        ],
        temperature=0.0,
        max_tokens=1500,
        response_format={"type": "json_object"},
    )
    result = json.loads(response.choices[0].message.content)
    result["rag_stats"] = {
        "articles_retrieved": len(raw_articles),
        "articles_validated": len(validated_articles),
        "filter_rate":        f"{len(validated_articles)}/{len(raw_articles)}",
        "source":             source,
    }
    return result
