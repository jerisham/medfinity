from django.urls import path
from .views import (RegisterView, UserProfileView, DoctorListView, 
                    DoctorDetailView, DoctorAvailabilityView, get_user_dashboard)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('dashboard/', get_user_dashboard, name='dashboard'),
    path('doctors/', DoctorListView.as_view(), name='doctor-list'),
    path('doctors/<int:pk>/', DoctorDetailView.as_view(), name='doctor-detail'),
    path('doctors/<int:doctor_id>/availability/', DoctorAvailabilityView.as_view(), name='doctor-availability'),
]
