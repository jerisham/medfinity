from rest_framework import generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Notification, MedicineReminder
from .serializers import NotificationSerializer, MedicineReminderSerializer

class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

class MedicineReminderListCreateView(generics.ListCreateAPIView):
    serializer_class = MedicineReminderSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return MedicineReminder.objects.filter(patient=self.request.user, is_active=True)
    
    def perform_create(self, serializer):
        serializer.save(patient=self.request.user)


class MedicineReminderDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MedicineReminderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return MedicineReminder.objects.filter(patient=self.request.user)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, pk):
    notification = get_object_or_404(Notification, pk=pk, user=request.user)
    notification.is_read = True
    notification.save()
    return Response({'message': 'Marked as read'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_read(request):
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({'message': 'All notifications marked as read'})