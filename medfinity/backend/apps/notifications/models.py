from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Notification(models.Model):
    NOTIFICATION_TYPES = (
        ('appointment', 'Appointment'),
        ('prescription', 'Prescription'),
        ('order', 'Order'),
        ('reminder', 'Reminder'),
        ('emergency', 'Emergency'),
        ('general', 'General'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES, default='general')
    is_read = models.BooleanField(default=False)
    related_id = models.PositiveIntegerField(null=True, blank=True)  # ID of related object
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']

class MedicineReminder(models.Model):
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='medicine_reminders')
    medicine_name = models.CharField(max_length=200)
    dosage = models.CharField(max_length=100)
    time = models.TimeField()
    frequency = models.CharField(max_length=50)  # daily, twice_daily, etc.
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'medicine_reminders'