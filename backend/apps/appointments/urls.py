from django.urls import path
from .views import (AppointmentListCreateView, AppointmentDetailView, 
                    DoctorSlotsView, CreateSlotView, cancel_appointment, upcoming_appointments)

urlpatterns = [
    path('', AppointmentListCreateView.as_view(), name='appointment-list'),
    path('<int:pk>/', AppointmentDetailView.as_view(), name='appointment-detail'),
    path('<int:pk>/cancel/', cancel_appointment, name='cancel-appointment'),
    path('upcoming/', upcoming_appointments, name='upcoming-appointments'),
    path('slots/<int:doctor_id>/', DoctorSlotsView.as_view(), name='doctor-slots'),
    path('slots/create/', CreateSlotView.as_view(), name='create-slot'),
]
