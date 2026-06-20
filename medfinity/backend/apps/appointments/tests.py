from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import Appointment
from datetime import date, time

User = get_user_model()

class AppointmentModelTest(TestCase):
    def setUp(self):
        self.patient = User.objects.create_user(
            username='patient1', email='p@example.com', password='test123', user_type='patient'
        )
        self.doctor = User.objects.create_user(
            username='doctor1', email='d@example.com', password='test123', user_type='doctor',
            specialization='Cardiology'
        )

    def test_create_appointment(self):
        appt = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            appointment_date=date(2026, 6, 20),
            appointment_time=time(10, 0),
            symptoms='Headache'
        )
        self.assertEqual(appt.status, 'scheduled')
        self.assertEqual(str(appt), f"{self.patient} with Dr. {self.doctor} on 2026-06-20")
