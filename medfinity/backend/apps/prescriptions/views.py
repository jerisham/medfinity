from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Prescription, Medicine, PrescriptionOCR
from .serializers import (PrescriptionSerializer, PrescriptionCreateSerializer, 
                          MedicineSerializer, PrescriptionOCRSerializer)
from apps.ai_services.ocr_service import OCRService

class PrescriptionListView(generics.ListAPIView):
    serializer_class = PrescriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'doctor':
            return Prescription.objects.filter(doctor=user)
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


class PrescriptionOCRUploadView(generics.CreateAPIView):
    serializer_class = PrescriptionOCRSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        ocr_instance = serializer.save()

        # Process OCR asynchronously
        try:
            ocr_service = OCRService()
            result = ocr_service.extract_text(ocr_instance.image.path)
            ocr_instance.extracted_text = result['text']
            ocr_instance.confidence_score = result['confidence']
            ocr_instance.processed = True
            ocr_instance.save()
        except Exception as e:
            ocr_instance.extracted_text = f"Error: {str(e)}"
            ocr_instance.save()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_prescription_image(request):
    """Quick endpoint to upload and OCR a prescription image"""
    if 'image' not in request.FILES:
        return Response({'error': 'No image provided'}, status=400)

    image = request.FILES['image']

    try:
        ocr_service = OCRService()
        result = ocr_service.extract_text_from_image(image)
        return Response({
            'extracted_text': result['text'],
            'confidence': result['confidence'],
            'medicines_detected': result.get('medicines', [])
        })
    except Exception as e:
        return Response({'error': str(e)}, status=500)
