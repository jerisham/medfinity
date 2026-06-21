from django.urls import path
from .views import (PrescriptionListView, PrescriptionDetailView, PrescriptionCreateView,
                    MedicineListCreateView)

urlpatterns = [
    path('', PrescriptionListView.as_view(), name='prescription-list'),
    path('create/', PrescriptionCreateView.as_view(), name='prescription-create'),
    path('<int:pk>/', PrescriptionDetailView.as_view(), name='prescription-detail'),
    path('<int:prescription_id>/medicines/', MedicineListCreateView.as_view(), name='medicine-list'),
]
