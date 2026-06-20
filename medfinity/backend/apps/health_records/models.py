from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class HealthRecord(models.Model):
    RECORD_TYPES = (
        ('lab_report', 'Lab Report'),
        ('xray', 'X-Ray'),
        ('mri', 'MRI'),
        ('ct_scan', 'CT Scan'),
        ('prescription', 'Prescription'),
        ('discharge_summary', 'Discharge Summary'),
        ('vaccination', 'Vaccination Record'),
        ('other', 'Other'),
    )
    
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='health_records')
    record_type = models.CharField(max_length=20, choices=RECORD_TYPES)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    file = models.FileField(upload_to='health_records/%Y/%m/')
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='uploaded_records')
    hospital_name = models.CharField(max_length=200, blank=True)
    doctor_name = models.CharField(max_length=200, blank=True)
    record_date = models.DateField()
    is_shared_with_doctor = models.BooleanField(default=False)
    shared_doctors = models.ManyToManyField(User, related_name='shared_records', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'health_records'
        ordering = ['-record_date']

class VitalSigns(models.Model):
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='vital_signs')
    recorded_at = models.DateTimeField(auto_now_add=True)
    blood_pressure_systolic = models.PositiveIntegerField(null=True, blank=True)
    blood_pressure_diastolic = models.PositiveIntegerField(null=True, blank=True)
    heart_rate = models.PositiveIntegerField(null=True, blank=True)
    temperature = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    height_cm = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    blood_sugar = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    oxygen_saturation = models.PositiveIntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'vital_signs'
        ordering = ['-recorded_at']