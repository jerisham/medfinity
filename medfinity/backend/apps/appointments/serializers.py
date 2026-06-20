from rest_framework import serializers
from .models import Appointment, AppointmentSlot
from apps.users.serializers import DoctorListSerializer, UserSerializer

class AppointmentSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppointmentSlot
        fields = '__all__'


class AppointmentSerializer(serializers.ModelSerializer):
    doctor_details = DoctorListSerializer(source='doctor', read_only=True)
    doctor_name = serializers.CharField(source='doctor.get_full_name', read_only=True)
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)

    class Meta:
        model = Appointment
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'meeting_link']

    def validate(self, data):
        if data['patient'] == data['doctor']:
            raise serializers.ValidationError("Patient and doctor cannot be the same person")
        return data


class AppointmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = ['doctor', 'appointment_date', 'appointment_time', 'appointment_type', 'symptoms', 'notes']

    def create(self, validated_data):
        validated_data['patient'] = self.context['request'].user
        appointment = super().create(validated_data)
        AppointmentSlot.objects.filter(
            doctor=appointment.doctor,
            date=appointment.appointment_date,
            start_time=appointment.appointment_time,
            is_booked=False,
        ).update(is_booked=True)
        return appointment
