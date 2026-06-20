from rest_framework import serializers
from .models import Prescription, Medicine, PrescriptionOCR
from apps.users.serializers import UserSerializer

class MedicineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medicine
        fields = '__all__'


class MedicineCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medicine
        fields = ['name', 'dosage', 'frequency', 'duration', 'timing', 'instructions']


class PrescriptionSerializer(serializers.ModelSerializer):
    medicines = MedicineSerializer(many=True, read_only=True)
    doctor_name = serializers.CharField(source='doctor.get_full_name', read_only=True)
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)

    class Meta:
        model = Prescription
        fields = '__all__'
        read_only_fields = ['created_at']


class PrescriptionCreateSerializer(serializers.ModelSerializer):
    medicines = MedicineCreateSerializer(many=True, required=False)

    class Meta:
        model = Prescription
        fields = ['appointment', 'patient', 'diagnosis', 'notes', 'follow_up_date', 'medicines']

    def create(self, validated_data):
        medicines_data = validated_data.pop('medicines', [])
        prescription = Prescription.objects.create(**validated_data)
        for medicine_data in medicines_data:
            Medicine.objects.create(prescription=prescription, **medicine_data)
        return prescription


class PrescriptionOCRSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrescriptionOCR
        fields = '__all__'
        read_only_fields = ['extracted_text', 'confidence_score', 'processed', 'created_at']
