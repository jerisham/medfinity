from rest_framework import serializers
from .models import HealthRecord, VitalSigns

class HealthRecordSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    
    class Meta:
        model = HealthRecord
        fields = '__all__'
        read_only_fields = ['created_at', 'uploaded_by']

class VitalSignsSerializer(serializers.ModelSerializer):
    bmi = serializers.SerializerMethodField()
    
    class Meta:
        model = VitalSigns
        fields = '__all__'
        read_only_fields = ['recorded_at']
    
    def get_bmi(self, obj):
        if obj.weight_kg and obj.height_cm:
            height_m = obj.height_cm / 100
            return round(float(obj.weight_kg) / (height_m ** 2), 2)
        return None