from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .models import DoctorAvailability
from .serializers import (UserSerializer, UserRegistrationSerializer, 
                          DoctorListSerializer, DoctorAvailabilitySerializer)

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = UserRegistrationSerializer


class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class DoctorListView(generics.ListAPIView):
    queryset = User.objects.filter(user_type='doctor', is_available=True)
    serializer_class = DoctorListSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['first_name', 'last_name', 'specialization']
    ordering_fields = ['rating', 'consultation_fee', 'experience_years']


class DoctorDetailView(generics.RetrieveAPIView):
    queryset = User.objects.filter(user_type='doctor')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]


class DoctorAvailabilityView(generics.ListCreateAPIView):
    serializer_class = DoctorAvailabilitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        doctor_id = self.kwargs.get('doctor_id')
        return DoctorAvailability.objects.filter(doctor_id=doctor_id, is_available=True)

    def perform_create(self, serializer):
        serializer.save(doctor=self.request.user)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_dashboard(request):
    user = request.user
    data = {
        'id': user.id,
        'name': user.get_full_name(),
        'type': user.user_type,
        'email': user.email,
        'phone': user.phone,
    }

    if user.user_type == 'patient':
        data['upcoming_appointments'] = user.appointments.filter(status='scheduled').count()
        data['total_consultations'] = user.appointments.filter(status='completed').count()
    elif user.user_type == 'doctor':
        data['today_appointments'] = user.doctor_appointments.filter(status='scheduled').count()
        data['total_patients'] = user.doctor_appointments.values('patient').distinct().count()
        data['rating'] = str(user.rating)
    elif user.user_type == 'pharmacist':
        data['pending_orders'] = 0  # Will link to pharmacy app

    return Response(data)
