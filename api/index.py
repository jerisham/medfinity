import os
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

# Django setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.core.management import call_command

try:
    call_command('migrate', interactive=False)
except Exception as e:
    print("Migration error:", e)

# WSGI
from django.core.wsgi import get_wsgi_application
app = get_wsgi_application()
