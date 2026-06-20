from django.urls import path
from .views import (create_video_room, get_consultation_details, start_consultation,
                    end_consultation, ChatMessageListCreateView)

urlpatterns = [
    path('room/<int:appointment_id>/', create_video_room, name='create-video-room'),
    path('details/<int:appointment_id>/', get_consultation_details, name='consultation-details'),
    path('start/<int:appointment_id>/', start_consultation, name='start-consultation'),
    path('end/<int:appointment_id>/', end_consultation, name='end-consultation'),
    path('messages/<int:consultation_id>/', ChatMessageListCreateView.as_view(), name='chat-messages'),
]
