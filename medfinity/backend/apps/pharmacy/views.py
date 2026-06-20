from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import PharmacyOrder, OrderItem, MedicineInventory
from .serializers import (PharmacyOrderSerializer, OrderItemSerializer, 
                          MedicineInventorySerializer, OrderCreateSerializer)

class OrderListView(generics.ListAPIView):
    serializer_class = PharmacyOrderSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'pharmacist':
            return PharmacyOrder.objects.filter(pharmacy=user)
        return PharmacyOrder.objects.filter(patient=user)

class OrderCreateView(generics.CreateAPIView):
    serializer_class = OrderCreateSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(patient=self.request.user)

class OrderDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = PharmacyOrderSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'pharmacist':
            return PharmacyOrder.objects.filter(pharmacy=user)
        return PharmacyOrder.objects.filter(patient=user)

class InventoryListCreateView(generics.ListCreateAPIView):
    serializer_class = MedicineInventorySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return MedicineInventory.objects.filter(pharmacy=self.request.user, is_available=True)
    
    def perform_create(self, serializer):
        serializer.save(pharmacy=self.request.user)

@api_view(['POST', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_order_status(request, pk):
    order = get_object_or_404(PharmacyOrder, pk=pk)
    if request.user != order.pharmacy:
        return Response({'error': 'Not authorized'}, status=403)
    
    new_status = request.data.get('status')
    if new_status not in [s[0] for s in PharmacyOrder.STATUS_CHOICES]:
        return Response({'error': 'Invalid status'}, status=400)
    
    order.status = new_status
    order.save()
    return Response({'message': 'Status updated', 'status': new_status})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_medicines(request):
    query = request.query_params.get('q', '')
    medicines = MedicineInventory.objects.filter(
        medicine_name__icontains=query,
        is_available=True,
        stock_quantity__gt=0
    )[:20]
    serializer = MedicineInventorySerializer(medicines, many=True)
    return Response(serializer.data)
