from django.contrib import admin
from .models import Notification, MedicineReminder

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'title', 'notification_type', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read', 'created_at']

@admin.register(MedicineReminder)
class MedicineReminderAdmin(admin.ModelAdmin):
    list_display = ['patient', 'medicine_name', 'time', 'frequency', 'is_active']
    list_filter = ['is_active', 'frequency']