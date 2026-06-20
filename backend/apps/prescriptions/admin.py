from django.contrib import admin
from .models import Prescription, Medicine, PrescriptionOCR

class MedicineInline(admin.TabularInline):
    model = Medicine
    extra = 1

@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ['patient', 'doctor', 'diagnosis', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['patient__username', 'doctor__username', 'diagnosis']
    inlines = [MedicineInline]

@admin.register(PrescriptionOCR)
class PrescriptionOCRAdmin(admin.ModelAdmin):
    list_display = ['prescription', 'processed', 'confidence_score', 'created_at']
    list_filter = ['processed']
