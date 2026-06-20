from rest_framework import serializers
from .models import Appointment, AppointmentSlot
from apps.users.serializers import DoctorListSerializer

class AppointmentSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppointmentSlot
        fields = '__all__'


class AppointmentSerializer(serializers.ModelSerializer):
    doctor_name = serializers.SerializerMethodField()
    doctor_specialization = serializers.CharField(source='doctor.specialization', read_only=True)
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    patient_id = serializers.IntegerField(source='patient.id', read_only=True)
    doctor_details = DoctorListSerializer(source='doctor', read_only=True)

    class Meta:
        model = Appointment
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'meeting_link']

    def get_doctor_name(self, obj):
        return obj.doctor.get_full_name()


class AppointmentCreateSerializer(serializers.ModelSerializer):
    # appointment_time defaults to 09:00 if not provided
    appointment_time = serializers.TimeField(default='09:00:00', required=False)

    class Meta:
        model = Appointment
        fields = ['id', 'doctor', 'appointment_date', 'appointment_time', 'appointment_type',
                  'symptoms', 'notes', 'status', 'created_at']
        read_only_fields = ['id', 'status', 'created_at']

    def create(self, validated_data):
        validated_data['patient'] = self.context['request'].user
        # Prevent booking own profile
        if validated_data['patient'] == validated_data['doctor']:
            raise serializers.ValidationError({'doctor': 'You cannot book an appointment with yourself.'})
        return super().create(validated_data)
