from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q
from .models import Appointment, AppointmentSlot
from .serializers import (AppointmentSerializer, AppointmentCreateSerializer,
                          AppointmentSlotSerializer)

class AppointmentListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['appointment_date', 'status']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AppointmentCreateSerializer
        return AppointmentSerializer

    def get_queryset(self):
        user = self.request.user
        patient_id = self.request.query_params.get('patient_id')

        if user.user_type == 'doctor':
            qs = Appointment.objects.filter(doctor=user)
            if patient_id:
                qs = qs.filter(patient_id=patient_id)
            return qs
        return Appointment.objects.filter(patient=user)

    def perform_create(self, serializer):
        # patient is set inside AppointmentCreateSerializer.create()
        appointment = serializer.save()
        from apps.notifications.utlis import notify_appointment_booked
        notify_appointment_booked(appointment)


class AppointmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'doctor':
            return Appointment.objects.filter(doctor=user)
        return Appointment.objects.filter(patient=user)


class DoctorSlotsView(generics.ListAPIView):
    serializer_class = AppointmentSlotSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        doctor_id = self.kwargs.get('doctor_id')
        date = self.request.query_params.get('date')
        queryset = AppointmentSlot.objects.filter(doctor_id=doctor_id, is_booked=False)
        if date:
            queryset = queryset.filter(date=date)
        return queryset


class CreateSlotView(generics.CreateAPIView):
    serializer_class = AppointmentSlotSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(doctor=self.request.user)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_appointment(request, pk):
    try:
        appointment = Appointment.objects.get(pk=pk)
        if request.user not in [appointment.patient, appointment.doctor]:
            return Response({'error': 'Not authorized'}, status=403)

        appointment.status = 'cancelled'
        appointment.save()

        # Free up the slot
        AppointmentSlot.objects.filter(
            doctor=appointment.doctor,
            date=appointment.appointment_date,
            start_time=appointment.appointment_time
        ).update(is_booked=False)

        return Response({'message': 'Appointment cancelled'})
    except Appointment.DoesNotExist:
        return Response({'error': 'Appointment not found'}, status=404)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_appointment_status(request, pk):
    """Allows doctors to update appointment status (e.g. completed, in_progress)."""
    try:
        appointment = Appointment.objects.get(pk=pk, doctor=request.user)
        new_status = request.data.get('status')
        valid_statuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'no_show']
        if new_status not in valid_statuses:
            return Response({'error': 'Invalid status'}, status=400)
        appointment.status = new_status
        appointment.save()
        return Response({'message': 'Status updated', 'status': new_status})
    except Appointment.DoesNotExist:
        return Response({'error': 'Appointment not found'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def upcoming_appointments(request):
    user = request.user
    today = timezone.now().date()

    if user.user_type == 'doctor':
        appointments = Appointment.objects.filter(
            doctor=user,
            appointment_date__gte=today,
            status__in=['scheduled', 'confirmed', 'in_progress']
        ).order_by('appointment_date', 'appointment_time')
    else:
        appointments = Appointment.objects.filter(
            patient=user,
            appointment_date__gte=today,
            status__in=['scheduled', 'confirmed', 'in_progress']
        ).order_by('appointment_date', 'appointment_time')

    serializer = AppointmentSerializer(appointments, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def doctor_patients(request):
    """Return the list of unique patients the doctor has had appointments with."""
    user = request.user
    if user.user_type != 'doctor':
        return Response({'error': 'Only doctors can access this endpoint'}, status=403)

    appointments = Appointment.objects.filter(doctor=user).select_related('patient')
    seen = set()
    patients = []
    for appt in appointments:
        p = appt.patient
        if p.id not in seen:
            seen.add(p.id)
            patients.append({
                'id': p.id,
                'first_name': p.first_name,
                'last_name': p.last_name,
                'full_name': p.get_full_name(),
                'email': p.email,
                'phone': p.phone,
                'blood_group': p.blood_group,
                'allergies': p.allergies,
                'chronic_conditions': p.chronic_conditions,
                'date_of_birth': str(p.date_of_birth) if p.date_of_birth else None,
                'last_visit': str(appt.appointment_date),
                'total_visits': Appointment.objects.filter(doctor=user, patient=p).count(),
            })

    return Response(patients)