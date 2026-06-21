from django.core.mail import send_mail
from django.conf import settings

def send_sms(phone_number, message):
    """Placeholder for SMS integration (Twilio, etc.)"""
    # Integrate with Twilio or other SMS service
    pass

def generate_meeting_id():
    """Generate unique meeting ID."""
    import uuid
    return str(uuid.uuid4())[:12]

def format_time_12hr(time_obj):
    """Format time to 12-hour format."""
    return time_obj.strftime('%I:%M %p')

def calculate_age(birth_date):
    """Calculate age from date of birth."""
    from datetime import date
    today = date.today()
    return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))