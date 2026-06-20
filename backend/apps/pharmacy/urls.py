from django.urls import path
from .views import (OrderListView, OrderCreateView, OrderDetailView,
                    InventoryListCreateView, update_order_status, search_medicines)

urlpatterns = [
    path('orders/', OrderListView.as_view(), name='order-list'),
    path('orders/create/', OrderCreateView.as_view(), name='order-create'),
    path('orders/<int:pk>/', OrderDetailView.as_view(), name='order-detail'),
    path('orders/<int:pk>/status/', update_order_status, name='update-status'),
    path('inventory/', InventoryListCreateView.as_view(), name='inventory-list'),
    path('search/', search_medicines, name='search-medicines'),
]