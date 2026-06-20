from django.urls import path
from .views import (PrescriptionListView, PrescriptionDetailView, PrescriptionCreateView,
                    MedicineListCreateView, PrescriptionOCRUploadView, upload_prescription_image)

urlpatterns = [
    path('', PrescriptionListView.as_view(), name='prescription-list'),
    path('create/', PrescriptionCreateView.as_view(), name='prescription-create'),
    path('<int:pk>/', PrescriptionDetailView.as_view(), name='prescription-detail'),
    path('<int:prescription_id>/medicines/', MedicineListCreateView.as_view(), name='medicine-list'),
    path('ocr/upload/', PrescriptionOCRUploadView.as_view(), name='ocr-upload'),
    path('ocr/quick/', upload_prescription_image, name='ocr-quick'),
]
