from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Prescription, Medicine, PrescriptionOCR
from .serializers import (PrescriptionSerializer, PrescriptionCreateSerializer,
                          MedicineSerializer, PrescriptionOCRSerializer)

class PrescriptionListView(generics.ListAPIView):
    serializer_class = PrescriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        patient_id = self.request.query_params.get('patient_id')

        if user.user_type == 'doctor':
            qs = Prescription.objects.filter(doctor=user)
            if patient_id:
                qs = qs.filter(patient_id=patient_id)
            return qs
        return Prescription.objects.filter(patient=user)


class PrescriptionDetailView(generics.RetrieveAPIView):
    serializer_class = PrescriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'doctor':
            return Prescription.objects.filter(doctor=user)
        return Prescription.objects.filter(patient=user)


class PrescriptionCreateView(generics.CreateAPIView):
    serializer_class = PrescriptionCreateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(doctor=self.request.user)


class MedicineListCreateView(generics.ListCreateAPIView):
    serializer_class = MedicineSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        prescription_id = self.kwargs.get('prescription_id')
        return Medicine.objects.filter(prescription_id=prescription_id)

    def perform_create(self, serializer):
        prescription_id = self.kwargs.get('prescription_id')
        prescription = get_object_or_404(Prescription, id=prescription_id)
        serializer.save(prescription=prescription)
