from rest_framework import serializers

from .models import ChatMessage, VideoConsultation


class VideoConsultationSerializer(serializers.ModelSerializer):
    class Meta:
        model = VideoConsultation
        fields = '__all__'
        read_only_fields = ['started_at', 'ended_at', 'duration_seconds']


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)

    class Meta:
        model = ChatMessage
        fields = '__all__'
        read_only_fields = ['sender', 'consultation', 'timestamp', 'is_read']
