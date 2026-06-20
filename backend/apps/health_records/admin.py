from django.contrib import admin
from .models import HealthRecord, VitalSigns

@admin.register(HealthRecord)
class HealthRecordAdmin(admin.ModelAdmin):
    list_display = ['patient', 'record_type', 'title', 'record_date', 'created_at']
    list_filter = ['record_type', 'record_date']

@admin.register(VitalSigns)
class VitalSignsAdmin(admin.ModelAdmin):
    list_display = ['patient', 'recorded_at', 'blood_pressure_systolic', 'heart_rate', 'temperature']
    list_filter = ['recorded_at']