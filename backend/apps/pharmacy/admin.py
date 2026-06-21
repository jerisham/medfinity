from django.contrib import admin
from .models import PharmacyOrder, OrderItem, MedicineInventory

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 1

@admin.register(PharmacyOrder)
class PharmacyOrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'patient', 'pharmacy', 'status', 'total_amount', 'created_at']
    list_filter = ['status', 'created_at']
    inlines = [OrderItemInline]

@admin.register(MedicineInventory)
class MedicineInventoryAdmin(admin.ModelAdmin):
    list_display = ['pharmacy', 'medicine_name', 'stock_quantity', 'unit_price', 'is_available']
    list_filter = ['is_available', 'requires_prescription']