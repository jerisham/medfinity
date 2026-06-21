"""
Standalone Gemini key test — run this directly with your venv's python,
from inside the backend/ folder, to see the REAL error Google returns.

    cd backend
    python ../test_gemini_key.py

(or copy this file into backend/ and run `python test_gemini_key.py`)
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Adjust this path if you run the script from somewhere else
load_dotenv(Path("backend/.env") if Path("backend/.env").exists() else Path(".env"))

api_key = os.getenv("GEMINI_API_KEY")
print(f"Loaded key: {api_key[:8]}...{api_key[-4:] if api_key else ''}  (length={len(api_key) if api_key else 0})")

if not api_key:
    print("No GEMINI_API_KEY found — check your .env path / working directory.")
    raise SystemExit(1)

from google import genai

try:
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-2.0-flash-lite",
        contents="Say hello in 5 words.",
    )
    print("SUCCESS! Gemini responded:")
    print(response.text)
except Exception as e:
    print("FAILED. Full error below — this tells us exactly what's wrong:")
    print(repr(e))