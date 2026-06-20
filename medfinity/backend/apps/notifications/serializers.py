from rest_framework import serializers
from .models import Notification, MedicineReminder

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ['created_at', 'user']

class MedicineReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicineReminder
        fields = '__all__'
        read_only_fields = ['patient']