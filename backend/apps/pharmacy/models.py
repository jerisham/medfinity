from django.db import models
from django.contrib.auth import get_user_model
from apps.prescriptions.models import Prescription, Medicine

User = get_user_model()

class PharmacyOrder(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('preparing', 'Preparing'),
        ('ready', 'Ready for Pickup'),
        ('out_for_delivery', 'Out for Delivery'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    )
    
    prescription = models.ForeignKey(Prescription, on_delete=models.CASCADE, related_name='orders')
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='pharmacy_orders')
    pharmacy = models.ForeignKey(User, on_delete=models.CASCADE, related_name='pharmacy_received_orders')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    delivery_address = models.TextField()
    delivery_type = models.CharField(max_length=20, choices=(('pickup', 'Pickup'), ('delivery', 'Delivery')), default='delivery')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'pharmacy_orders'
        ordering = ['-created_at']

class OrderItem(models.Model):
    order = models.ForeignKey(PharmacyOrder, on_delete=models.CASCADE, related_name='items')
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'order_items'

class MedicineInventory(models.Model):
    pharmacy = models.ForeignKey(User, on_delete=models.CASCADE, related_name='inventory')
    medicine_name = models.CharField(max_length=200)
    generic_name = models.CharField(max_length=200, blank=True)
    stock_quantity = models.PositiveIntegerField(default=0)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    requires_prescription = models.BooleanField(default=True)
    is_available = models.BooleanField(default=True)

    class Meta:
        db_table = 'medicine_inventory'
        unique_together = ['pharmacy', 'medicine_name']