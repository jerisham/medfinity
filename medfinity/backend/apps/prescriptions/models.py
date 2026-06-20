from django.db import models
from django.contrib.auth import get_user_model
from apps.appointments.models import Appointment

User = get_user_model()

class Prescription(models.Model):
    appointment = models.OneToOneField(Appointment, on_delete=models.CASCADE, related_name='prescription', null=True, blank=True)
    doctor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='prescriptions_written')
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='prescriptions_received')
    diagnosis = models.TextField()
    notes = models.TextField(blank=True)
    follow_up_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'prescriptions'
        ordering = ['-created_at']

    def __str__(self):
        return f"Prescription for {self.patient} by Dr. {self.doctor}"


class Medicine(models.Model):
    prescription = models.ForeignKey(Prescription, on_delete=models.CASCADE, related_name='medicines')
    name = models.CharField(max_length=200)
    dosage = models.CharField(max_length=100)  # e.g., "1 tablet"
    frequency = models.CharField(max_length=100)  # e.g., "Twice daily"
    duration = models.CharField(max_length=100)  # e.g., "7 days"
    timing = models.CharField(max_length=100, blank=True)  # e.g., "After meals"
    instructions = models.TextField(blank=True)

    class Meta:
        db_table = 'medicines'

    def __str__(self):
        return f"{self.name} - {self.dosage}"


class PrescriptionOCR(models.Model):
    prescription = models.ForeignKey(Prescription, on_delete=models.CASCADE, related_name='ocr_data')
    image = models.ImageField(upload_to='prescriptions/ocr/')
    extracted_text = models.TextField(blank=True)
    confidence_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    processed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'prescription_ocr'
