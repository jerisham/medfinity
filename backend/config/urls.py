"""
Root URL configuration for Medfinity.
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.shortcuts import redirect
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

def serve_frontend_root(request):
    return redirect('/pages/login.html')

def serve_frontend_file(request, path):
    return redirect(f'/{path}')

urlpatterns = [
    path('', serve_frontend_root, name='frontend'),
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
    # Catch-all: redirect any other path to its /static/ equivalent
    # (pages/login.html -> /static/pages/login.html, etc.)
    # Excludes static/ and media/ so requests to those prefixes aren't
    # redirected back into themselves (relevant for local `runserver`/
    # `vercel dev`; on Vercel itself the CDN serves /static/* before
    # these patterns are ever reached).
    re_path(r'^(?!static/|media/)(?P<path>.+)$', serve_frontend_file, name='frontend_files'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
