from django.contrib import admin
from .models import VideoConsultation, ChatMessage

@admin.register(VideoConsultation)
class VideoConsultationAdmin(admin.ModelAdmin):
    list_display = ['appointment', 'room_name', 'status', 'started_at', 'ended_at']
    list_filter = ['status']

@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ['consultation', 'sender', 'message', 'timestamp', 'is_read']
    list_filter = ['is_read', 'timestamp']
