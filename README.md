# Medfinity 🏥✨

**AI-Powered Integrated Healthcare Ecosystem**

Medfinity is a comprehensive healthcare management platform that connects **Patients, Doctors, Pharmacists, and Caregivers** through a unified digital ecosystem. The platform leverages Artificial Intelligence to improve healthcare accessibility, streamline medical services, and enhance patient engagement.

---

## 🚀 Features

### 👤 Multi-Role Authentication

* Patient Registration & Login
* Doctor Registration & Login
* Pharmacist Registration & Login
* Role-Based Access Control

### 📅 Appointment Management

* Search and discover doctors
* Book appointments
* Manage appointment schedules
* Track appointment status

### 🎥 Video Consultations

* Secure online consultations
* Virtual doctor-patient interactions
* Consultation tracking

### 💊 Prescription Management

* Digital prescription generation
* Prescription history
* Medication details and dosage tracking

### 📂 Health Records Management

* Upload medical records
* Access health history
* Share records with healthcare professionals

### 🏪 Pharmacy Management

* Pharmacy Dashboard
* Medicine Inventory Management
* Medicine Ordering System
* Order Tracking

### ⏰ Medication Reminders

* Medicine scheduling
* Automated reminder notifications
* Medication adherence support

### 🤖 AI-Powered Healthcare Assistance

* AI Symptom Checker
* AI Doctor Recommendation System
* AI Medical Report Summarizer
* Prescription OCR Processing

### ❤️ Vital Signs Monitoring (Under development)

* Blood Pressure Tracking
* Heart Rate Monitoring
* Blood Sugar Records
* Oxygen Saturation Tracking
* Weight & Height Records

---

## 🏗️ System Architecture

```text
Client Layer
     │
     ▼
Frontend Interface
     │
     ▼
REST API Layer
     │
     ▼
Django Backend Services
     │
     ▼
Database & Cloud Storage

AI Services
     │
     ▼
Google Gemini AI
```

---

## 🛠️ Technology Stack

### Frontend

* HTML5
* CSS3
* JavaScript

### Backend

* Python
* Django
* Django REST Framework

### Database

* SQLite / PostgreSQL

### Authentication

* JWT Authentication
* SimpleJWT

### AI Services

* Google Gemini API
* Prompt Engineering

### Cloud Storage

* Cloudinary

### Deployment

* Vercel

### Development Tools

* Git
* GitHub
* VS Code

---

## ⚙️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/medfinity.git
cd backend
```

### 2. Create Virtual Environment

```bash
python -m venv venv
```

### 3. Activate Virtual Environment

#### Windows

```bash
venv\Scripts\activate
```

#### Linux / macOS

```bash
source venv/bin/activate
```

### 4. Install Dependencies

```bash
pip install -r backend\requirements.txt
```

### 5. Configure Environment Variables

Create a `.env` file:

```env
SECRET_KEY=your_secret_key

DEBUG=True

GEMINI_API_KEY=your_gemini_api_key

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 6. Apply Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### 7. Run Development Server

```bash
python manage.py runserver
```

Server will start at:

```text
http://127.0.0.1:8000/
```

---

## 🤖 AI Modules

### AI Symptom Checker

Users can enter symptoms and receive:

* Possible health conditions
* Preliminary healthcare guidance
* Recommended next steps

### AI Doctor Recommendation

Provides:

* Specialty recommendations
* Suitable doctor suggestions

### Prescription OCR

Allows users to:

* Upload prescription images
* Extract medicine details
* Digitize handwritten prescriptions

---

## 🔒 Security Features

* JWT Authentication
* Secure Password Hashing
* Role-Based Access Control
* Protected API Endpoints
* Secure Cloud File Storage

---

## 📈 Future Enhancements

* Telemedicine Expansion
* Electronic Health Records (EHR)
* Wearable Device Integration
* AI Disease Prediction
* Voice-Based AI Assistant
* Online Payments
* Emergency Healthcare Module
* Hospital Management Integration

---

## 👥 Team Zyphix

### Team Members

* Jerisha M
* Athish K R
* Reeshitha A

---

## 🏆 Hackathon Submission

**Project Name:** Medfinity

**Team Name:** Zyphix

**Hackathon:** Bharat Academix CodeQuest

**Submission Date:** 22 June 2026

---

## 📜 License

This project was developed for educational and hackathon purposes under Bharat Academix CodeQuest.

---

### "Transforming Healthcare Through AI and Innovation."
