from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import HealthRecord, VitalSigns
from .serializers import HealthRecordSerializer, VitalSignsSerializer

class HealthRecordListCreateView(generics.ListCreateAPIView):
    serializer_class = HealthRecordSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'doctor':
            return HealthRecord.objects.filter(shared_doctors=user) | HealthRecord.objects.filter(is_shared_with_doctor=True)
        return HealthRecord.objects.filter(patient=user)
    
    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user, patient=self.request.user)

class HealthRecordDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = HealthRecordSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'doctor':
            return HealthRecord.objects.filter(shared_doctors=user)
        return HealthRecord.objects.filter(patient=user)

class VitalSignsListCreateView(generics.ListCreateAPIView):
    serializer_class = VitalSignsSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return VitalSigns.objects.filter(patient=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(patient=self.request.user)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def share_record_with_doctor(request, pk):
    record = get_object_or_404(HealthRecord, pk=pk, patient=request.user)
    doctor_id = request.data.get('doctor_id')
    record.shared_doctors.add(doctor_id)
    record.is_shared_with_doctor = True
    record.save()
    return Response({'message': 'Record shared successfully'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_latest_vitals(request):
    vitals = VitalSigns.objects.filter(patient=request.user).first()
    if vitals:
        serializer = VitalSignsSerializer(vitals)
        return Response(serializer.data)
    return Response({'message': 'No vitals recorded yet'})