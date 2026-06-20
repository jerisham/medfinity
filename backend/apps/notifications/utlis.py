from django.core.mail import send_mail
from django.conf import settings
from .models import Notification

def create_notification(user, title, message, notification_type='general', related_id=None):
    """Create an in-app notification."""
    return Notification.objects.create(
        user=user,
        title=title,
        message=message,
        notification_type=notification_type,
        related_id=related_id
    )

def send_email_notification(user, subject, message):
    """Send email notification."""
    if user.email:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True
        )

def notify_appointment_booked(appointment):
    """Notify patient and doctor about appointment."""
    # Notify patient
    create_notification(
        user=appointment.patient,
        title='Appointment Booked',
        message=f'Your appointment with Dr. {appointment.doctor.get_full_name()} is scheduled for {appointment.appointment_date} at {appointment.appointment_time}',
        notification_type='appointment',
        related_id=appointment.id
    )
    # Notify doctor
    create_notification(
        user=appointment.doctor,
        title='New Appointment',
        message=f'New appointment with {appointment.patient.get_full_name()} on {appointment.appointment_date} at {appointment.appointment_time}',
        notification_type='appointment',
        related_id=appointment.id
    )

def notify_prescription_ready(prescription):
    """Notify patient when prescription is ready."""
    create_notification(
        user=prescription.patient,
        title='Prescription Ready',
        message=f'Your prescription from Dr. {prescription.doctor.get_full_name()} is ready',
        notification_type='prescription',
        related_id=prescription.id
    )

def notify_order_status(order):
    """Notify patient about order status change."""
    create_notification(
        user=order.patient,
        title='Order Update',
        message=f'Your order #{order.id} is now {order.get_status_display()}',
        notification_type='order',
        related_id=order.id
    )