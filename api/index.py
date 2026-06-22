"""
Vercel serverless entry point for Medfinity Django app.
Vercel looks for api/index.py and calls the `app` variable.
"""
import sys
import os

# Add the backend directory to Python path so Django can find config/settings.py
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

from django.core.wsgi import get_wsgi_application
app = get_wsgi_application()
