import os
import sys
import django

# Set up Django environment
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.users.views import RegisterView, UserProfileView
from apps.pharmacy.views import InventoryListCreateView, InventoryDetailView
from apps.pharmacy.models import MedicineInventory
from apps.appointments.serializers import AppointmentCreateSerializer

User = get_user_model()
factory = APIRequestFactory()

def run_tests():
    print("=== STARTING BACKEND INTEGRATION TESTS ===")

    # 1. Test Pharmacist Registration
    print("\n1. Testing Pharmacist Registration...")
    # Clean up old user if exists
    User.objects.filter(username='pharma_test').delete()
    
    reg_data = {
        'username': 'pharma_test',
        'email': 'pharma@test.com',
        'password': 'Password123!',
        'password2': 'Password123!',
        'first_name': 'John',
        'last_name': 'Doe',
        'user_type': 'pharmacist',
        'phone': '1234567890',
        'pharmacy_name': 'City Pharmacy',
        'pharmacy_license': 'DL-888999'
    }
    
    request = factory.post('/api/users/register/', reg_data)
    view = RegisterView.as_view()
    response = view(request)
    
    assert response.status_code == 201, f"Registration failed: {response.data}"
    print("-> Pharmacist registered successfully!")
    
    # Verify user fields in DB
    user = User.objects.get(username='pharma_test')
    assert user.pharmacy_name == 'City Pharmacy'
    assert user.pharmacy_license == 'DL-888999'
    assert user.date_of_birth is None
    print("-> DB registration fields verified!")

    # 2. Test Profile Retrieving and Updating (without Date of Birth)
    print("\n2. Testing Pharmacist Profile View & Update...")
    request = factory.get('/api/users/profile/')
    force_authenticate(request, user=user)
    view = UserProfileView.as_view()
    response = view(request)
    assert response.status_code == 200
    assert response.data['pharmacy_license'] == 'DL-888999'
    
    # Update profile fields - Omit date_of_birth
    update_data = {
        'first_name': 'Johnny',
        'last_name': 'Smith',
        'email': 'pharmaswitch@test.com',
        'phone': '9999999999',
        'pharmacy_name': 'Metro Pharmacy',
        'pharmacy_license': 'DL-111222'
    }
    request = factory.patch('/api/users/profile/', update_data)
    force_authenticate(request, user=user)
    response = view(request)
    assert response.status_code == 200
    assert response.data['first_name'] == 'Johnny'
    assert response.data['pharmacy_name'] == 'Metro Pharmacy'
    assert response.data['pharmacy_license'] == 'DL-111222'
    assert response.data['date_of_birth'] is None
    print("-> Pharmacist profile loaded, updated, and validated (no DOB required)!")

    # 3. Test Pharmacy Inventory Operations
    print("\n3. Testing Pharmacy Inventory creation & listing...")
    MedicineInventory.objects.filter(pharmacy=user).delete()
    
    inv_data = {
        'medicine_name': 'Amoxicillin 500mg',
        'generic_name': 'Amoxicillin',
        'stock_quantity': 150,
        'unit_price': 12.50,
        'requires_prescription': True
    }
    
    request = factory.post('/api/pharmacy/inventory/', inv_data)
    force_authenticate(request, user=user)
    view_list = InventoryListCreateView.as_view()
    response = view_list(request)
    assert response.status_code == 201, f"Inventory creation failed: {response.data}"
    
    # Retrieve inventory list
    request = factory.get('/api/pharmacy/inventory/')
    force_authenticate(request, user=user)
    response = view_list(request)
    assert response.status_code == 200
    print("Response data:", response.data)
    results = response.data if isinstance(response.data, list) else response.data.get('results', [])
    print("Results:", results)
    assert len(results) == 1
    item = results[0]
    assert item['medicine_name'] == 'Amoxicillin 500mg'
    assert item['stock_quantity'] == 150
    print("-> Medicine inventory item added and retrieved successfully!")

    # 4. Test Pharmacy Inventory Detail / Update view
    print("\n4. Testing Pharmacy Inventory item detail update...")
    item_id = item['id']
    update_item_data = {
        'stock_quantity': 250,
        'unit_price': 14.00
    }
    request = factory.patch(f'/api/pharmacy/inventory/{item_id}/', update_item_data)
    force_authenticate(request, user=user)
    view_detail = InventoryDetailView.as_view()
    response = view_detail(request, pk=item_id)
    assert response.status_code == 200
    assert response.data['stock_quantity'] == 250
    assert response.data['unit_price'] == '14.00'
    print("-> Medicine stock quantity and price updated successfully!")

    print("\n=== ALL BACKEND TESTS PASSED SUCCESSFULLY! ===")

if __name__ == '__main__':
    run_tests()
