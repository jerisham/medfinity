import os
import sys

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

# Django setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

from django.core.wsgi import get_wsgi_application
app = get_wsgi_application()
