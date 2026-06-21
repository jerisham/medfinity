from rest_framework import serializers
from .models import PharmacyOrder, OrderItem, MedicineInventory
from apps.prescriptions.models import Medicine
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
    pharmacy_name = serializers.CharField(source='pharmacy.pharmacy_name', read_only=True)

    class Meta:
        model = PharmacyOrder
        fields = ['id', 'prescription', 'pharmacy', 'pharmacy_name', 'items',
                  'delivery_address', 'delivery_type', 'status', 'total_amount', 'created_at']
        read_only_fields = ['id', 'status', 'total_amount', 'created_at']

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError('Select at least one medicine to order.')
        for item in items:
            if not item.get('medicine_id'):
                raise serializers.ValidationError('Each item needs a medicine_id (the prescription medicine line being ordered).')
            qty = item.get('quantity', 1)
            try:
                if int(qty) < 1:
                    raise ValueError
            except (TypeError, ValueError):
                raise serializers.ValidationError('Quantity must be a positive whole number.')
        return items

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        pharmacy = validated_data['pharmacy']
        order = PharmacyOrder.objects.create(**validated_data)
        total = 0
        try:
            for item in items_data:
                medicine_id = item.get('medicine_id')
                quantity = int(item.get('quantity', 1))

                # medicine_id refers to a prescriptions.Medicine line item (e.g.
                # "Paracetamol 650") — the actual stock & price for it live in
                # *this pharmacy's* MedicineInventory, matched by name, since a
                # prescription's medicine and a pharmacy's stock are separate models.
                medicine = Medicine.objects.get(id=medicine_id)
                inventory = MedicineInventory.objects.filter(
                    pharmacy=pharmacy,
                    medicine_name__iexact=medicine.name,
                    is_available=True,
                ).first()

                if not inventory:
                    raise serializers.ValidationError({
                        'items': f'"{medicine.name}" is not available at this pharmacy.'
                    })
                if inventory.stock_quantity < quantity:
                    raise serializers.ValidationError({
                        'items': f'Only {inventory.stock_quantity} unit(s) of "{medicine.name}" left in stock.'
                    })

                unit_price = inventory.unit_price
                total_price = unit_price * quantity
                OrderItem.objects.create(
                    order=order,
                    medicine_id=medicine_id,
                    quantity=quantity,
                    unit_price=unit_price,
                    total_price=total_price
                )
                # Reserve the stock immediately so two patients can't both order
                # the last few units of the same medicine.
                inventory.stock_quantity -= quantity
                inventory.save(update_fields=['stock_quantity'])
                total += total_price
        except Medicine.DoesNotExist:
            order.delete()
            raise serializers.ValidationError({'items': 'One of the selected medicines could not be found.'})
        except serializers.ValidationError:
            order.delete()
            raise

        order.total_amount = total
        order.save()
        return order