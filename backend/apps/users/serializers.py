from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, DoctorAvailability

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'user_type', 
                  'phone', 'address', 'date_of_birth', 'profile_picture', 'is_verified',
                  'specialization', 'license_number', 'experience_years', 'rating',
                  'consultation_fee', 'is_available', 'blood_group', 'allergies',
                  'chronic_conditions', 'emergency_contact', 'pharmacy_name',
                  'pharmacy_license', 'latitude', 'longitude', 'created_at']
        read_only_fields = ['id', 'rating', 'is_verified', 'created_at']


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'first_name', 'last_name',
                  'user_type', 'phone', 'date_of_birth', 'specialization', 'license_number',
                  'pharmacy_name', 'pharmacy_license', 'experience_years', 'consultation_fee',
                  'latitude', 'longitude', 'address']

    def validate(self, attrs):
        password = attrs.get('password')
        password2 = attrs.get('password2')
        if password2 and password != password2:
            raise serializers.ValidationError({"password": "Passwords don't match"})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2', None)
        user = User.objects.create_user(**validated_data)
        return user


class DoctorListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'specialization', 'experience_years',
                  'rating', 'consultation_fee', 'is_available', 'profile_picture']


class PharmacistListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'pharmacy_name', 'pharmacy_license',
                  'phone', 'address', 'profile_picture', 'latitude', 'longitude']


class DoctorAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorAvailability
        fields = '__all__'