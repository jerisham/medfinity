from django.db import models
from django.contrib.auth import get_user_model
from apps.appointments.models import Appointment

User = get_user_model()

class VideoConsultation(models.Model):
    appointment = models.OneToOneField(Appointment, on_delete=models.CASCADE, related_name='video_consultation')
    room_name = models.CharField(max_length=100, unique=True)
    jitsi_link = models.URLField()
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.PositiveIntegerField(default=0)
    recording_url = models.URLField(blank=True)
    status = models.CharField(max_length=20, default='scheduled', choices=[
        ('scheduled', 'Scheduled'),
        ('ongoing', 'Ongoing'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ])

    class Meta:
        db_table = 'video_consultations'

    def __str__(self):
        return f"Video: {self.appointment}"


class ChatMessage(models.Model):
    consultation = models.ForeignKey(VideoConsultation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField()
    attachment = models.FileField(upload_to='chat_attachments/', blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        db_table = 'chat_messages'
        ordering = ['timestamp']

    def __str__(self):
        return f"{self.sender}: {self.message[:50]}"
