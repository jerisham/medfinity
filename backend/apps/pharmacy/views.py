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
        order = serializer.save(patient=self.request.user)
        from apps.notifications.utlis import notify_new_order
        notify_new_order(order)

class OrderDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = PharmacyOrderSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'pharmacist':
            return PharmacyOrder.objects.filter(pharmacy=user)
        return PharmacyOrder.objects.filter(patient=user)

    def perform_update(self, serializer):
        # Patients may only cancel their own order, and only while it's
        # still pending — every other status transition (confirmed →
        # delivered, etc.) is the pharmacy's call via update_order_status.
        order = self.get_object()
        if self.request.user == order.patient:
            new_status = serializer.validated_data.get('status')
            if new_status and new_status != 'cancelled':
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('Patients can only cancel an order, not change its delivery status.')
            if new_status == 'cancelled' and order.status != 'pending':
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('This order has already moved past pending and can no longer be self-cancelled.')
        serializer.save()

class InventoryListCreateView(generics.ListCreateAPIView):
    serializer_class = MedicineInventorySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return MedicineInventory.objects.filter(pharmacy=self.request.user, is_available=True)
    
    def perform_create(self, serializer):
        # NOTE: DRF's BooleanField treats an omitted field as False (not "use the
        # model default") when the request is form/multipart-encoded, since it mirrors
        # HTML checkbox semantics. That would silently hide newly added inventory
        # items from this same list (is_available=True filter) the moment they're
        # created. Force the intended default explicitly so behavior doesn't depend
        # on how the client encodes the request.
        extra = {}
        if 'is_available' not in self.request.data:
            extra['is_available'] = True
        serializer.save(pharmacy=self.request.user, **extra)

@api_view(['POST'])
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

    from apps.notifications.utlis import notify_order_status
    notify_order_status(order)

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


class InventoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MedicineInventorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return MedicineInventory.objects.filter(pharmacy=self.request.user)