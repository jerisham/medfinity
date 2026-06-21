from django.urls import path
from .views import (NotificationListView, MedicineReminderListCreateView,
                    MedicineReminderDetailView, mark_notification_read, mark_all_read)

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification-list'),
    path('read/<int:pk>/', mark_notification_read, name='mark-read'),
    path('read-all/', mark_all_read, name='mark-all-read'),
    path('reminders/', MedicineReminderListCreateView.as_view(), name='reminder-list'),
    path('reminders/<int:pk>/', MedicineReminderDetailView.as_view(), name='reminder-detail'),
]