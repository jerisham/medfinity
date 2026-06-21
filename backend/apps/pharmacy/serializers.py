from rest_framework import serializers
from .models import PharmacyOrder, OrderItem, MedicineInventory
from apps.users.serializers import UserSerializer

class MedicineInventorySerializer(serializers.ModelSerializer):
    pharmacy_name = serializers.CharField(source='pharmacy.pharmacy_name', read_only=True)
    
    class Meta:
        model = MedicineInventory
        fields = '__all__'
        read_only_fields = ['pharmacy']

    def validate(self, attrs):
        # We need to access the request context to check the pharmacy (which is request.user)
        request = self.context.get('request')
        if request and request.user:
            pharmacy = request.user
            medicine_name = attrs.get('medicine_name')
            # Check unique_together manually to avoid 500 error if it already exists
            exists = MedicineInventory.objects.filter(pharmacy=pharmacy, medicine_name=medicine_name).exists()
            # If we are updating, make sure we don't block editing the same instance
            if exists and (not self.instance or self.instance.medicine_name != medicine_name):
                raise serializers.ValidationError({
                    "medicine_name": "Medicine with this name already exists in your inventory. Please update the existing stock instead."
                })
        return attrs

class OrderItemSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source='medicine.name', read_only=True)
    
    class Meta:
        model = OrderItem
        fields = '__all__'

class PharmacyOrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    pharmacy_name = serializers.CharField(source='pharmacy.pharmacy_name', read_only=True)
    
    class Meta:
        model = PharmacyOrder
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

class OrderCreateSerializer(serializers.ModelSerializer):
    items = serializers.ListField(child=serializers.DictField(), write_only=True)
    
    class Meta:
        model = PharmacyOrder
        fields = ['prescription', 'pharmacy', 'items', 'delivery_address', 'delivery_type']
    
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        order = PharmacyOrder.objects.create(**validated_data)
        total = 0
        for item in items_data:
            medicine_id = item.get('medicine_id')
            quantity = item.get('quantity', 1)
            inventory = MedicineInventory.objects.get(id=medicine_id)
            unit_price = inventory.unit_price
            total_price = unit_price * quantity
            OrderItem.objects.create(
                order=order,
                medicine_id=medicine_id,
                quantity=quantity,
                unit_price=unit_price,
                total_price=total_price
            )
            total += total_price
        order.total_amount = total
        order.save()
        return order