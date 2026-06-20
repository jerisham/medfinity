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
        if user.user_type == 'doctor':
            return Appointment.objects.filter(doctor=user)
        return Appointment.objects.filter(patient=user)

    def perform_create(self, serializer):
        serializer.save(patient=self.request.user)


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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def upcoming_appointments(request):
    user = request.user
    today = timezone.now().date()

    if user.user_type == 'doctor':
        appointments = Appointment.objects.filter(
            doctor=user,
            appointment_date__gte=today,
            status__in=['scheduled', 'confirmed']
        )
    else:
        appointments = Appointment.objects.filter(
            patient=user,
            appointment_date__gte=today,
            status__in=['scheduled', 'confirmed']
        )

    serializer = AppointmentSerializer(appointments, many=True)
    return Response(serializer.data)
