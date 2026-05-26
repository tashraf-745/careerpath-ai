import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

OPENAI_API_KEY   = os.getenv("OPENAI_API_KEY", "")
SERPER_API_KEY   = os.getenv("SERPER_API_KEY", "")
RAPIDAPI_KEY     = os.getenv("RAPIDAPI_KEY", "")
CURRENTS_API_KEY = os.getenv("CURRENTS_API_KEY", "")
MODEL            = os.getenv("MODEL", "gpt-4o-mini")
MEMORY_DIR       = os.getenv("MEMORY_DIR", "/tmp/careerpath_memory")

if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY is not set. Add it to your .env file.")

os.makedirs(MEMORY_DIR, exist_ok=True)

client = OpenAI(api_key=OPENAI_API_KEY)

STAGE_AFFORDANCES = {
    "entry":      [],
    "assessment": ["web_search", "get_salary_benchmark"],
    "job_search": ["job_search"],
    "applying":   ["parse_resume", "web_search"],
    "tracking":   ["get_news", "job_search"],
}
