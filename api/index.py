"""
Vercel serverless entry point.

Vercel's Python runtime looks for a WSGI/ASGI `app` (or `application`)
callable in api/index.py. This just imports Django's WSGI app from
backend/config and exposes it under the name Vercel expects.
"""
import os
import sys
from pathlib import Path

# backend/ contains manage.py, config/, apps/, etc. Add it to the path
# so "import config.settings" and "import apps.*" resolve the same way
# they do when running manage.py locally.
BASE_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = BASE_DIR / "backend"
sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

from django.core.wsgi import get_wsgi_application  # noqa: E402

app = get_wsgi_application()
