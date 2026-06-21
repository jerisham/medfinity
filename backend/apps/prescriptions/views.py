from rest_framework import generics, status, serializers
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
        appointment = serializer.validated_data.get('appointment')
        if appointment and appointment.doctor_id != self.request.user.id:
            raise serializers.ValidationError({'appointment': 'You can only attach a prescription to your own appointment.'})

        prescription = serializer.save(doctor=self.request.user)

        # If this prescription closes out an appointment, mark it completed so
        # it disappears from "upcoming" on both the doctor and patient side.
        if appointment and appointment.status not in ('completed', 'cancelled'):
            appointment.status = 'completed'
            appointment.save(update_fields=['status'])

        from apps.notifications.utlis import notify_prescription_ready
        notify_prescription_ready(prescription)


class MedicineListCreateView(generics.ListCreateAPIView):
    serializer_class = MedicineSerializer
    permission_classes = [IsAuthenticated]

    def get_prescription(self):
        prescription_id = self.kwargs.get('prescription_id')
        prescription = get_object_or_404(Prescription, id=prescription_id)
        user = self.request.user
        if user not in (prescription.doctor, prescription.patient):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You don't have access to this prescription.")
        return prescription

    def get_queryset(self):
        prescription = self.get_prescription()
        return Medicine.objects.filter(prescription=prescription)

    def perform_create(self, serializer):
        prescription = self.get_prescription()
        if self.request.user != prescription.doctor:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only the prescribing doctor can add medicines to this prescription.')
        serializer.save(prescription=prescription)