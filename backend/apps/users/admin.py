from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, DoctorAvailability

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'first_name', 'last_name', 'user_type', 'is_verified', 'is_available']
    list_filter = ['user_type', 'is_verified', 'is_available', 'is_staff']
    fieldsets = UserAdmin.fieldsets + (
        ('Medfinity Info', {'fields': ('user_type', 'phone', 'address', 'date_of_birth', 
                                       'profile_picture', 'is_verified', 'specialization',
                                       'license_number', 'experience_years', 'rating',
                                       'consultation_fee', 'is_available', 'blood_group',
                                       'allergies', 'chronic_conditions', 'emergency_contact',
                                       'pharmacy_name', 'pharmacy_license')}),
    )

@admin.register(DoctorAvailability)
class DoctorAvailabilityAdmin(admin.ModelAdmin):
    list_display = ['doctor', 'day', 'start_time', 'end_time', 'is_available']
    list_filter = ['day', 'is_available']
