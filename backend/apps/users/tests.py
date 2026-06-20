from django.test import TestCase
from django.contrib.auth import get_user_model

User = get_user_model()

class UserModelTest(TestCase):
    def test_create_user(self):
        user = User.objects.create_user(
            username='testpatient',
            email='test@example.com',
            password='testpass123',
            user_type='patient'
        )
        self.assertEqual(user.user_type, 'patient')
        self.assertTrue(user.is_active)

    def test_create_doctor(self):
        doctor = User.objects.create_user(
            username='testdoctor',
            email='doctor@example.com',
            password='testpass123',
            user_type='doctor',
            specialization='Cardiology',
            license_number='DOC123'
        )
        self.assertEqual(doctor.specialization, 'Cardiology')
