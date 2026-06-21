from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .models import DoctorAvailability
from .serializers import (UserSerializer, UserRegistrationSerializer, 
                          DoctorListSerializer, DoctorAvailabilitySerializer,
                          PharmacistListSerializer)

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
    serializer_class = DoctorListSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['first_name', 'last_name', 'specialization', 'license_number']
    ordering_fields = ['rating', 'consultation_fee', 'experience_years']

    def get_queryset(self):
        # Show all doctors including unavailable ones (frontend filters display)
        return User.objects.filter(user_type='doctor')


class DoctorDetailView(generics.RetrieveAPIView):
    queryset = User.objects.filter(user_type='doctor')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]


class PharmacistListView(generics.ListAPIView):
    """List pharmacies a patient can send a prescription order to."""
    serializer_class = PharmacistListSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['pharmacy_name', 'first_name', 'last_name', 'address']

    def get_queryset(self):
        return User.objects.filter(user_type='pharmacist')


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
def nearby_pharmacies(request):
    """Rank registered pharmacies by Haversine distance from the patient's
    current coordinates (sent as ?lat=..&lng=.. — typically captured by the
    browser's geolocation API on the order page). Pharmacies without saved
    coordinates are listed last since distance can't be computed for them."""
    import math

    try:
        lat = float(request.query_params.get('lat'))
        lng = float(request.query_params.get('lng'))
    except (TypeError, ValueError):
        return Response({'error': 'lat and lng query params are required.'}, status=400)

    def haversine_km(lat1, lon1, lat2, lon2):
        R = 6371.0  # Earth's radius in km
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
        return 2 * R * math.asin(math.sqrt(a))

    pharmacies = User.objects.filter(user_type='pharmacist')
    results = []
    for ph in pharmacies:
        entry = PharmacistListSerializer(ph).data
        if ph.latitude is not None and ph.longitude is not None:
            entry['distance_km'] = round(haversine_km(lat, lng, ph.latitude, ph.longitude), 2)
        else:
            entry['distance_km'] = None
        results.append(entry)

    results.sort(key=lambda r: (r['distance_km'] is None, r['distance_km']))
    return Response(results)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_dashboard(request):
    from django.utils import timezone

    user = request.user
    today = timezone.now().date()
    active_statuses = ['scheduled', 'confirmed', 'in_progress']

    data = {
        'id': user.id,
        'name': user.get_full_name(),
        'type': user.user_type,
        'email': user.email,
        'phone': user.phone,
    }

    if user.user_type == 'patient':
        # "Upcoming" means future-dated and not yet resolved — a scheduled
        # appointment from last month shouldn't still count.
        data['upcoming_appointments'] = user.appointments.filter(
            appointment_date__gte=today,
            status__in=active_statuses,
        ).count()
        data['total_consultations'] = user.appointments.filter(status='completed').count()
    elif user.user_type == 'doctor':
        # Was previously counting every scheduled appointment ever, on any
        # date — the "Today" stat tile needs this scoped to today's date.
        data['today_appointments'] = user.doctor_appointments.filter(
            appointment_date=today,
            status__in=active_statuses,
        ).count()
        data['total_patients'] = user.doctor_appointments.values('patient').distinct().count()
        data['rating'] = str(user.rating)
    elif user.user_type == 'pharmacist':
        data['pending_orders'] = user.pharmacy_received_orders.filter(status='pending').count()

    return Response(data)