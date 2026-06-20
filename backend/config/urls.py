"""
Root URL configuration for Medfinity.
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse, Http404
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
import os
import mimetypes

def serve_frontend_file(request, path='index.html'):
    """Serve any file from the frontend directory."""
    file_path = settings.FRONTEND_DIR / path
    if not file_path.exists() or not file_path.is_file():
        raise Http404(f"Frontend file not found: {path}")
    mime_type, _ = mimetypes.guess_type(str(file_path))
    with open(file_path, 'rb') as f:
        return HttpResponse(f.read(), content_type=mime_type or 'text/html')

urlpatterns = [
    path('', serve_frontend_file, name='frontend'),
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/users/', include('apps.users.urls')),
    path('api/appointments/', include('apps.appointments.urls')),
    path('api/consultations/', include('apps.consultations.urls')),
    path('api/prescriptions/', include('apps.prescriptions.urls')),
    path('api/pharmacy/', include('apps.pharmacy.urls')),
    path('api/health-records/', include('apps.health_records.urls')),
    path('api/ai/', include('apps.ai_services.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    # Catch-all: serve any frontend file (pages, js, css, images)
    re_path(r'^(?P<path>.+)$', serve_frontend_file, name='frontend_files'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.FRONTEND_DIR)
