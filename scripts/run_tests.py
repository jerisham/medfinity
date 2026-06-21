"""
Medfinity - Comprehensive Backend Test Script
Tests all key endpoints across the platform.
"""
import urllib.request
import json
import datetime
import sys
import os

BASE = 'http://localhost:8000/api'
PASS = 0
FAIL = 0


def test(label, req, expected_status=200):
    global PASS, FAIL
    try:
        resp = urllib.request.urlopen(req)
        data = json.loads(resp.read().decode())
        print(f'  [PASS] {label}')
        PASS += 1
        return data
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f'  [FAIL] {label}: HTTP {e.code} - {body[:120]}')
        FAIL += 1
        return None
    except Exception as e:
        print(f'  [FAIL] {label}: {e}')
        FAIL += 1
        return None


def post(url, data, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    return urllib.request.Request(url, data=json.dumps(data).encode(), headers=headers, method='POST')


def get(url, token=None):
    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    return urllib.request.Request(url, headers=headers)


def patch(url, data, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    return urllib.request.Request(url, data=json.dumps(data).encode(), headers=headers, method='PATCH')


print("\n" + "="*60)
print("  MEDFINITY - BACKEND API TEST SUITE")
print("="*60)

# ── Auth Tests ────────────────────────────────────────────────
print("\n[1] AUTH TESTS")
pt_tokens = test('Patient Login', post(f'{BASE}/token/', {'username': 'testpatient', 'password': 'Test1234!'}))
dr_tokens = test('Doctor Login',  post(f'{BASE}/token/', {'username': 'testdoctor',  'password': 'Test1234!'}))
ph_tokens = test('Pharmacy Login',post(f'{BASE}/token/', {'username': 'testpharmacy','password': 'Test1234!'}))

pt_token = pt_tokens['access'] if pt_tokens else None
dr_token = dr_tokens['access'] if dr_tokens else None
ph_token = ph_tokens['access'] if ph_tokens else None

# ── User Profile Tests ────────────────────────────────────────
print("\n[2] USER PROFILE TESTS")
profile = test('Get Patient Profile', get(f'{BASE}/users/profile/', pt_token))
if profile:
    print(f'     -> user: {profile.get("username")} ({profile.get("user_type")})')

upd = test('Update Patient Profile', patch(f'{BASE}/users/profile/', {'first_name': 'Updated', 'phone': '9876543210'}, pt_token))

dr_profile = test('Get Doctor Profile', get(f'{BASE}/users/profile/', dr_token))
if dr_profile:
    print(f'     -> doctor: {dr_profile.get("username")} spec={dr_profile.get("specialization")}')

# ── Doctors List ──────────────────────────────────────────────
print("\n[3] DOCTORS LIST & SEARCH")
docs = test('List All Doctors', get(f'{BASE}/users/doctors/', pt_token))
if docs:
    cnt = docs.get('count', len(docs.get('results', docs)))
    print(f'     -> {cnt} doctors found')

search_docs = test('Search Doctors by Name', get(f'{BASE}/users/doctors/?search=test', pt_token))
if search_docs:
    cnt = search_docs.get('count', len(search_docs.get('results', search_docs)))
    print(f'     -> {cnt} matching doctors')

# ── Appointments Tests ────────────────────────────────────────
print("\n[4] APPOINTMENT TESTS")

# Get doctor ID
doctor_id = None
if dr_profile:
    doctor_id = dr_profile.get('id')
    print(f'     -> using doctor id={doctor_id} (from profile)')
elif docs:
    results = docs.get('results', docs)
    if results:
        doctor_id = results[0]['id']
        print(f'     -> using doctor id={doctor_id}')

tomorrow = (datetime.date.today() + datetime.timedelta(days=1)).isoformat()
appt = None
if doctor_id and pt_token:
    appt = test('Book Appointment', post(f'{BASE}/appointments/', {
        'doctor': doctor_id,
        'appointment_date': tomorrow,
        'appointment_type': 'in_person',
        'symptoms': 'Headache and fever',
        'notes': 'General checkup',
        'appointment_time': '09:00:00'
    }, pt_token))
    if appt:
        print(f'     -> appointment id={appt.get("id")} status={appt.get("status")}')

appt_list = test('List Patient Appointments', get(f'{BASE}/appointments/', pt_token))
if appt_list:
    cnt = appt_list.get('count', len(appt_list.get('results', appt_list)))
    print(f'     -> {cnt} appointments')

upcoming = test('Upcoming Appointments', get(f'{BASE}/appointments/upcoming/', pt_token))
if upcoming:
    print(f'     -> {len(upcoming)} upcoming')

if appt and dr_token:
    upd_status = test('Doctor Updates Appt Status', patch(f'{BASE}/appointments/{appt["id"]}/status/', {'status': 'completed'}, dr_token))

# ── Prescriptions Tests ───────────────────────────────────────
print("\n[5] PRESCRIPTION TESTS")
rxs = test('List Patient Prescriptions', get(f'{BASE}/prescriptions/', pt_token))
if rxs:
    cnt = rxs.get('count', 0)
    print(f'     -> {cnt} prescriptions')

if appt and dr_token and profile:
    rx = test('Doctor Creates Prescription', post(f'{BASE}/prescriptions/create/', {
        'appointment': appt['id'],
        'patient': profile['id'],
        'diagnosis': 'Viral Fever - Test',
        'notes': 'Rest for 3 days',
        'follow_up_date': (datetime.date.today() + datetime.timedelta(days=7)).isoformat(),
        'medicines': [
            {'name': 'Paracetamol 650mg', 'dosage': '1 tablet', 'frequency': 'Three times daily', 'duration': '5 days', 'timing': 'After meals'},
            {'name': 'ORS Sachets', 'dosage': '1 sachet', 'frequency': 'Twice daily', 'duration': '3 days', 'timing': 'Morning and evening'},
        ]
    }, dr_token))
    if rx:
        print(f'     -> prescription id={rx.get("id")} diagnosis={rx.get("diagnosis")}')

# ── Doctor Patient Records Tests ──────────────────────────────
print("\n[6] DOCTOR PATIENT RECORDS")
patients = test('Doctor - List Patients', get(f'{BASE}/appointments/patients/', dr_token))
if patients:
    print(f'     -> {len(patients)} unique patients')

# ── Pharmacy Tests ────────────────────────────────────────────
print("\n[7] PHARMACY TESTS")
inv = test('List Pharmacy Inventory', get(f'{BASE}/pharmacy/inventory/', ph_token))
if inv:
    cnt = inv.get('count', len(inv.get('results', inv)))
    print(f'     -> {cnt} inventory items')

new_med = test('Add Medicine to Inventory', post(f'{BASE}/pharmacy/inventory/', {
    'medicine_name': 'Amoxicillin 500mg',
    'generic_name': 'Amoxicillin',
    'stock_quantity': 200,
    'unit_price': 12.5,
    'requires_prescription': True
}, ph_token))
if new_med:
    print(f'     -> added: {new_med.get("medicine_name")} qty={new_med.get("stock_quantity")}')
    med_id = new_med.get('id')
    if med_id:
        updated = test('Update Inventory Item', patch(f'{BASE}/pharmacy/inventory/{med_id}/', {
            'stock_quantity': 250, 'unit_price': 11.0
        }, ph_token))

orders = test('List Pharmacy Orders', get(f'{BASE}/pharmacy/orders/', ph_token))
if orders:
    cnt = orders.get('count', len(orders.get('results', orders)))
    print(f'     -> {cnt} orders')

# ── AI Tests ─────────────────────────────────────────────────
print("\n[8] AI CHAT TESTS")
ai_resp = test('AI Chat (No Auth Required)', post(f'{BASE}/ai/chat/', {'message': 'What are symptoms of common cold?'}))
if ai_resp:
    print(f'     -> response: {str(ai_resp.get("response",""))[:80]}...')

sym_resp = test('Symptom Checker', post(f'{BASE}/ai/symptom-checker/', {'symptoms': ['fever', 'cough', 'runny nose'], 'age': 25, 'gender': 'male', 'duration': '3 days'}))
if sym_resp:
    print(f'     -> response: {str(sym_resp.get("response",""))[:80]}...')

# ── Notifications Tests ───────────────────────────────────────
print("\n[9] NOTIFICATIONS")
notifs = test('List Notifications', get(f'{BASE}/notifications/', pt_token))
if notifs:
    cnt = notifs.get('count', len(notifs.get('results', notifs)))
    print(f'     -> {cnt} notifications')

# ── Summary ───────────────────────────────────────────────────
print("\n" + "="*60)
print(f"  RESULTS: {PASS} passed, {FAIL} failed out of {PASS+FAIL} tests")
print("="*60 + "\n")
