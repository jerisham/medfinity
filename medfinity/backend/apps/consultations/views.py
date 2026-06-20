from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import VideoConsultation, ChatMessage
from .serializers import ChatMessageSerializer
from apps.appointments.models import Appointment
import uuid

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_video_room(request, appointment_id):
    """Create a Jitsi video room for an appointment."""
    appointment = get_object_or_404(Appointment, id=appointment_id)

    # Check authorization
    if request.user not in [appointment.patient, appointment.doctor]:
        return Response({'error': 'Not authorized'}, status=403)

    # Generate unique room name
    room_name = f"medfinity-{appointment_id}-{uuid.uuid4().hex[:8]}"
    jitsi_link = f"https://meet.jit.si/{room_name}"

    consultation, created = VideoConsultation.objects.get_or_create(
        appointment=appointment,
        defaults={
            'room_name': room_name,
            'jitsi_link': jitsi_link,
            'status': 'scheduled'
        }
    )

    if not created:
        consultation.room_name = room_name
        consultation.jitsi_link = jitsi_link
        consultation.save()

    # Update appointment with meeting link
    appointment.meeting_link = jitsi_link
    appointment.appointment_type = 'video'
    appointment.save()

    return Response({
        'room_name': room_name,
        'jitsi_link': jitsi_link,
        'appointment_id': appointment_id,
        'status': consultation.status
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_consultation_details(request, appointment_id):
    """Get video consultation details."""
    appointment = get_object_or_404(Appointment, id=appointment_id)

    if request.user not in [appointment.patient, appointment.doctor]:
        return Response({'error': 'Not authorized'}, status=403)

    try:
        consultation = VideoConsultation.objects.get(appointment=appointment)
        return Response({
            'room_name': consultation.room_name,
            'jitsi_link': consultation.jitsi_link,
            'status': consultation.status,
            'started_at': consultation.started_at,
            'ended_at': consultation.ended_at,
        })
    except VideoConsultation.DoesNotExist:
        return Response({'error': 'No video consultation found'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_consultation(request, appointment_id):
    """Mark consultation as started."""
    appointment = get_object_or_404(Appointment, id=appointment_id)

    if request.user not in [appointment.patient, appointment.doctor]:
        return Response({'error': 'Not authorized'}, status=403)

    try:
        consultation = VideoConsultation.objects.get(appointment=appointment)
        from django.utils import timezone
        consultation.status = 'ongoing'
        consultation.started_at = timezone.now()
        consultation.save()

        appointment.status = 'in_progress'
        appointment.save()

        return Response({'message': 'Consultation started', 'status': 'ongoing'})
    except VideoConsultation.DoesNotExist:
        return Response({'error': 'No video consultation found'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def end_consultation(request, appointment_id):
    """Mark consultation as ended."""
    appointment = get_object_or_404(Appointment, id=appointment_id)

    if request.user not in [appointment.patient, appointment.doctor]:
        return Response({'error': 'Not authorized'}, status=403)

    try:
        consultation = VideoConsultation.objects.get(appointment=appointment)
        from django.utils import timezone
        consultation.status = 'completed'
        consultation.ended_at = timezone.now()

        if consultation.started_at:
            duration = (consultation.ended_at - consultation.started_at).total_seconds()
            consultation.duration_seconds = int(duration)

        consultation.save()

        appointment.status = 'completed'
        appointment.save()

        return Response({
            'message': 'Consultation ended',
            'status': 'completed',
            'duration_seconds': consultation.duration_seconds
        })
    except VideoConsultation.DoesNotExist:
        return Response({'error': 'No video consultation found'}, status=404)


class ChatMessageListCreateView(generics.ListCreateAPIView):
    """List and create chat messages for a consultation."""
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        consultation_id = self.kwargs.get('consultation_id')
        return ChatMessage.objects.filter(
            Q(consultation__appointment__patient=self.request.user) |
            Q(consultation__appointment__doctor=self.request.user),
            consultation_id=consultation_id
        )

    def perform_create(self, serializer):
        consultation_id = self.kwargs.get('consultation_id')
        consultation = get_object_or_404(
            VideoConsultation,
            id=consultation_id,
        )
        if self.request.user not in [consultation.appointment.patient, consultation.appointment.doctor]:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Not authorized for this consultation')
        serializer.save(consultation=consultation, sender=self.request.user)
