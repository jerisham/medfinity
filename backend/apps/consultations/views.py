from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.conf import settings
from .models import VideoConsultation, ChatMessage
from .jaas import generate_meeting_link, generate_user_jwt, build_room_name, jaas_configured
from apps.appointments.models import Appointment

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_video_room(request, appointment_id):
    """Create (or fetch) a video room for an appointment, JaaS-backed when configured."""
    appointment = get_object_or_404(Appointment, id=appointment_id)

    # Check authorization
    if request.user not in [appointment.patient, appointment.doctor]:
        return Response({'error': 'Not authorized'}, status=403)

    consultation = VideoConsultation.objects.filter(appointment=appointment).first()

    if not consultation:
        bare_room, jitsi_link, domain = generate_meeting_link(appointment_id)
        consultation = VideoConsultation.objects.create(
            appointment=appointment,
            room_name=bare_room,
            jitsi_link=jitsi_link,
            status='scheduled',
        )
        # Update appointment with meeting link
        appointment.meeting_link = jitsi_link
        appointment.appointment_type = 'video'
        appointment.save()

    return Response({
        'room_name': consultation.room_name,
        'jitsi_link': consultation.jitsi_link,
        'appointment_id': appointment_id,
        'status': consultation.status,
        'jaas_enabled': jaas_configured(),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_join_token(request, appointment_id):
    """
    Returns everything the frontend needs to join: the Jitsi domain, the
    (possibly App-ID-scoped) room name, and — when JaaS is configured — a
    signed JWT for *this* user with the correct moderator flag. The doctor
    is always the moderator, so the room never waits for one to "show up".
    """
    appointment = get_object_or_404(Appointment, id=appointment_id)

    if request.user not in [appointment.patient, appointment.doctor]:
        return Response({'error': 'Not authorized'}, status=403)

    consultation = VideoConsultation.objects.filter(appointment=appointment).first()
    if not consultation:
        return Response({'error': 'No video consultation found. Create the room first.'}, status=404)

    is_moderator = (request.user == appointment.doctor)
    full_room = build_room_name(appointment_id, consultation.room_name)
    token = generate_user_jwt(full_room, request.user, is_moderator)

    return Response({
        'domain': settings.JAAS_DOMAIN if jaas_configured() else 'meet.jit.si',
        'room_name': full_room if jaas_configured() else consultation.room_name,
        'jwt': token,  # null when JaaS isn't configured yet -> frontend falls back to public meet.jit.si
        'is_moderator': is_moderator,
        'jaas_enabled': jaas_configured(),
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
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        consultation_id = self.kwargs.get('consultation_id')
        return ChatMessage.objects.filter(consultation_id=consultation_id)

    def perform_create(self, serializer):
        consultation_id = self.kwargs.get('consultation_id')
        consultation = get_object_or_404(VideoConsultation, id=consultation_id)
        serializer.save(consultation=consultation, sender=self.request.user)