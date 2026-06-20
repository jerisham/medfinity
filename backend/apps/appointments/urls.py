from django.urls import path
from .views import (AppointmentListCreateView, AppointmentDetailView,
                    DoctorSlotsView, CreateSlotView, cancel_appointment,
                    upcoming_appointments, update_appointment_status, doctor_patients)

urlpatterns = [
    path('', AppointmentListCreateView.as_view(), name='appointment-list'),
    path('<int:pk>/', AppointmentDetailView.as_view(), name='appointment-detail'),
    path('<int:pk>/cancel/', cancel_appointment, name='cancel-appointment'),
    path('<int:pk>/status/', update_appointment_status, name='update-appointment-status'),
    path('upcoming/', upcoming_appointments, name='upcoming-appointments'),
    path('patients/', doctor_patients, name='doctor-patients'),
    path('slots/<int:doctor_id>/', DoctorSlotsView.as_view(), name='doctor-slots'),
    path('slots/create/', CreateSlotView.as_view(), name='create-slot'),
]
